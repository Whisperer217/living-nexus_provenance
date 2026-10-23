using System.Net.Http.Headers;
using System.Net.Http.Json;
using LivingNexus.Jellyfin.Models;
using MediaBrowser.Controller.Channels;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Channels;
using MediaBrowser.Model.Dto;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.MediaInfo;

namespace LivingNexus.Jellyfin.Channel;

/// <summary>
/// A read-only Jellyfin 12.2 channel. Living Nexus remains the authority for
/// publication, revocation, WIDs, attribution, and gateway authorization.
/// </summary>
public sealed class LivingNexusChannel : IChannel
{
    internal const string CatalogEndpoint = "https://www.livingnexus.org/api/v1/provenance-player/catalog";
    private const int DefaultPageSize = 50;
    // This is a verification read only. The plug-in never retains bytes or the
    // storage redirect URL; playback continues through the revocable gateway.
    private const int Mp3HeaderProbeBytes = 16;
    private const int MaxConcurrentMediaProbes = 8;
    private const string ExpectedSchema = "living-nexus-provenance-catalog/1";
    private readonly HttpClient _httpClient;

    public LivingNexusChannel(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient(nameof(LivingNexusChannel));
    }

    internal LivingNexusChannel(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public string Name => "Living Nexus";

    public string Description => "Read-only Portable Witness catalog. Living Nexus remains the registry and media authority.";

    public string DataVersion => "living-nexus-provenance-catalog/1";

    public string HomePageUrl => "https://www.livingnexus.org/witness-registry";

    public ChannelParentalRating ParentalRating => ChannelParentalRating.GeneralAudience;

    public InternalChannelFeatures GetChannelFeatures() => new()
    {
        MaxPageSize = 100,
        SupportsContentDownloading = false,
        MediaTypes = new List<ChannelMediaType> { ChannelMediaType.Audio },
        ContentTypes = new List<ChannelMediaContentType> { ChannelMediaContentType.Song },
    };

    public bool IsEnabledFor(string userId) => true;

    public async Task<ChannelItemResult> GetChannelItems(
        InternalChannelItemQuery query,
        CancellationToken cancellationToken)
    {
        var offset = Math.Max(0, query.StartIndex ?? 0);
        var limit = Math.Clamp(query.Limit ?? DefaultPageSize, 1, 100);
        var endpoint = $"{CatalogEndpoint}?limit={limit}&offset={offset}";

        using var response = await _httpClient.GetAsync(endpoint, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var catalog = await response.Content.ReadFromJsonAsync<PortableWitnessCatalog>(cancellationToken: cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException("Living Nexus returned no catalog body.");

        if (!string.Equals(catalog.Schema, ExpectedSchema, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Living Nexus returned an unsupported catalog schema.");
        }

        var candidates = catalog.Items.Where(IsSafeGatewayTrack).ToArray();
        using var probeLimiter = new SemaphoreSlim(MaxConcurrentMediaProbes);
        var resolved = await Task.WhenAll(candidates.Select(async track =>
        {
            await probeLimiter.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                return (Track: track, MediaSource: await TryCreateVerifiedMp3SourceAsync(track, cancellationToken).ConfigureAwait(false));
            }
            finally
            {
                probeLimiter.Release();
            }
        })).ConfigureAwait(false);

        // The portable catalog intentionally carries no unverified codec claim.
        // Omit a source the plug-in cannot verify rather than presenting an
        // extensionless gateway URL without the media facts Jellyfin requires.
        var items = resolved
            .Where(result => result.MediaSource is not null)
            .Select(result => ToChannelItem(result.Track, result.MediaSource!))
            .ToArray();

        return new ChannelItemResult
        {
            Items = items,
            // The source deliberately offers cursor-safe pages instead of a full total.
            TotalRecordCount = catalog.NextOffset is null ? offset + items.Length : null,
        };
    }

    public Task<DynamicImageResponse> GetChannelImage(ImageType type, CancellationToken cancellationToken) =>
        Task.FromResult<DynamicImageResponse>(null!);

    public IEnumerable<ImageType> GetSupportedChannelImages() => Array.Empty<ImageType>();

    internal static bool IsSafeGatewayTrack(PortableWitnessTrack track) =>
        !string.IsNullOrWhiteSpace(track.Title)
        && !string.IsNullOrWhiteSpace(track.Creator)
        && !string.IsNullOrWhiteSpace(track.WorkId)
        && !string.IsNullOrWhiteSpace(track.Wid)
        && Uri.TryCreate(track.AudioUrl, UriKind.Absolute, out var audioUri)
        && audioUri.Scheme == Uri.UriSchemeHttps
        && audioUri.Host.Equals("www.livingnexus.org", StringComparison.OrdinalIgnoreCase)
        && audioUri.AbsolutePath.StartsWith("/api/provenance-player/media/", StringComparison.Ordinal)
        && Uri.TryCreate(track.SourceUrl, UriKind.Absolute, out var sourceUri)
        && sourceUri.Scheme == Uri.UriSchemeHttps
        && sourceUri.Host.Equals("www.livingnexus.org", StringComparison.OrdinalIgnoreCase);

    private async Task<MediaSourceInfo?> TryCreateVerifiedMp3SourceAsync(
        PortableWitnessTrack track,
        CancellationToken cancellationToken)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, track.AudioUrl);
            request.Headers.Range = new RangeHeaderValue(0, Mp3HeaderProbeBytes - 1);

            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode) return null;

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            var bytes = new byte[Mp3HeaderProbeBytes];
            var bytesRead = await ReadAtMostAsync(stream, bytes, cancellationToken).ConfigureAwait(false);
            if (!IsVerifiedMp3(bytes.AsSpan(0, bytesRead), response.RequestMessage?.RequestUri)) return null;

            return new MediaSourceInfo
            {
                Id = $"living-nexus-gateway-{track.WorkId}",
                Name = "Living Nexus gateway",
                Path = track.AudioUrl,
                Protocol = MediaProtocol.Http,
                Container = "mp3",
                IsRemote = true,
                Type = MediaSourceType.Default,
                SupportsDirectPlay = true,
                // A gateway URL is not a plug-in remux path. Jellyfin 12.2
                // should select direct play or a real transcoding fallback.
                SupportsDirectStream = false,
                SupportsTranscoding = true,
                Formats = new[] { "mp3" },
                MediaStreams = new List<MediaStream>
                {
                    new()
                    {
                        Type = MediaStreamType.Audio,
                        Codec = "mp3",
                        Index = 0,
                        IsDefault = true,
                    },
                },
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (IOException)
        {
            return null;
        }
    }

    private static async Task<int> ReadAtMostAsync(Stream stream, byte[] buffer, CancellationToken cancellationToken)
    {
        var total = 0;
        while (total < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(total, buffer.Length - total), cancellationToken).ConfigureAwait(false);
            if (read == 0) break;
            total += read;
        }

        return total;
    }

    // An ID3 marker is not sufficient by itself: AAC can also contain ID3.
    // Treat it as an MP3 contract only when the gateway's transiently resolved
    // object name also declares .mp3. No resolved URI is retained on the item.
    private static bool IsVerifiedMp3(ReadOnlySpan<byte> bytes, Uri? resolvedUri) =>
        HasMpegAudioFrameAtStart(bytes)
        || (HasId3v2Header(bytes) && IsResolvedMp3Object(resolvedUri));

    private static bool HasId3v2Header(ReadOnlySpan<byte> bytes) =>
        bytes.Length >= 10
        && bytes[0] == (byte)'I'
        && bytes[1] == (byte)'D'
        && bytes[2] == (byte)'3';

    private static bool IsResolvedMp3Object(Uri? resolvedUri) =>
        resolvedUri is not null
        && resolvedUri.Scheme == Uri.UriSchemeHttps
        && resolvedUri.AbsolutePath.EndsWith(".mp3", StringComparison.OrdinalIgnoreCase);

    private static bool HasMpegAudioFrameAtStart(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 4 || bytes[0] != 0xff) return false;

        var versionAndLayer = bytes[1];
        var bitrateAndSampleRate = bytes[2];
        var hasFrameSync = (versionAndLayer & 0xe0) == 0xe0;
        var hasSupportedVersion = (versionAndLayer & 0x18) != 0x08;
        var hasSupportedLayer = (versionAndLayer & 0x06) != 0;
        var bitrateIndex = (bitrateAndSampleRate >> 4) & 0x0f;
        var sampleRateIndex = (bitrateAndSampleRate >> 2) & 0x03;
        return hasFrameSync
            && hasSupportedVersion
            && hasSupportedLayer
            && bitrateIndex is not 0 and not 0x0f
            && sampleRateIndex != 0x03;
    }

    private static ChannelItemInfo ToChannelItem(PortableWitnessTrack track, MediaSourceInfo mediaSource) => new()
    {
        Id = $"living-nexus-{track.WorkId}",
        Name = track.Title,
        Type = ChannelItemType.Media,
        MediaType = ChannelMediaType.Audio,
        ContentType = ChannelMediaContentType.Song,
        Overview = $"Witness ID: {track.Wid}\nRegistry: {track.SourceUrl}",
        HomePageUrl = track.SourceUrl,
        ImageUrl = track.ArtworkUrl,
        Artists = new List<string> { track.Creator },
        AlbumArtists = new List<string> { track.Creator },
        ProviderIds = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["LivingNexusWorkId"] = track.WorkId,
            ["LivingNexusWID"] = track.Wid,
        },
        MediaSources = new List<MediaSourceInfo> { mediaSource },
    };
}
