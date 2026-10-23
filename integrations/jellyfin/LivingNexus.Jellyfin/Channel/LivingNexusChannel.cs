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

        var items = catalog.Items
            .Where(IsSafeGatewayTrack)
            .Select(ToChannelItem)
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

    private static ChannelItemInfo ToChannelItem(PortableWitnessTrack track) => new()
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
        MediaSources = new List<MediaSourceInfo>
        {
            new()
            {
                Id = $"living-nexus-gateway-{track.WorkId}",
                Name = "Living Nexus gateway",
                Path = track.AudioUrl,
                Protocol = MediaProtocol.Http,
                IsRemote = true,
                Type = MediaSourceType.Default,
            },
        },
    };
}
