using System.Net;
using System.Text;
using LivingNexus.Jellyfin.Channel;
using MediaBrowser.Controller.Channels;
using MediaBrowser.Model.Entities;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LivingNexus.Jellyfin.Tests;

public sealed class LivingNexusChannelTests
{
    [Fact]
    public void Registers_the_read_only_channel_with_jellyfins_native_channel_manager()
    {
        var services = new ServiceCollection();

        new LivingNexusServiceRegistrator().RegisterServices(services, null!);

        var registration = Assert.Single(services, descriptor =>
            descriptor.ServiceType == typeof(IChannel)
            && descriptor.ImplementationType == typeof(LivingNexusChannel));
        Assert.Equal(ServiceLifetime.Singleton, registration.Lifetime);
    }

    [Fact]
    public async Task Maps_only_gateway_backed_portable_witness_tracks_to_audio_channel_items()
    {
        var payload = """
        {
          "schema": "living-nexus-provenance-catalog/1",
          "offset": 0,
          "limit": 50,
          "nextOffset": null,
          "items": [{
            "title": "Push Forward",
            "creator": "@DocSMercer",
            "workId": "60001",
            "wid": "WID-MUS-PUSH-FORWARD",
            "sourceUrl": "https://www.livingnexus.org/share/WID-MUS-PUSH-FORWARD",
            "audioUrl": "https://www.livingnexus.org/api/provenance-player/media/60001",
            "artworkUrl": "https://cdn.example.test/art.webp",
            "participation": { "music": "Both", "lyrics": "Human", "voice": "None" }
          }]
        }
        """;
        var (channel, handler) = CreateChannelWithHandler(payload, MpegFrameAtStart);

        var result = await channel.GetChannelItems(new InternalChannelItemQuery { StartIndex = 0, Limit = 50 }, CancellationToken.None);

        var item = Assert.Single(result.Items);
        Assert.Equal("Push Forward", item.Name);
        Assert.Equal("@DocSMercer", Assert.Single(item.Artists));
        Assert.Equal("WID-MUS-PUSH-FORWARD", item.ProviderIds["LivingNexusWID"]);
        var source = Assert.Single(item.MediaSources);
        Assert.Equal("https://www.livingnexus.org/api/provenance-player/media/60001", source.Path);
        Assert.True(source.IsRemote);
        Assert.Equal("mp3", source.Container);
        Assert.Equal(new[] { "mp3" }, source.Formats);
        Assert.True(source.SupportsDirectPlay);
        Assert.False(source.SupportsDirectStream);
        Assert.True(source.SupportsTranscoding);
        var audioStream = Assert.Single(source.MediaStreams);
        Assert.Equal(MediaStreamType.Audio, audioStream.Type);
        Assert.Equal("mp3", audioStream.Codec);
        Assert.Equal(0, audioStream.Index);
        Assert.True(audioStream.IsDefault);
        Assert.True(handler.SawGatewayProbe);
        Assert.Equal("bytes=0-15", handler.GatewayProbeRange);
        Assert.Equal("https://www.livingnexus.org/share/WID-MUS-PUSH-FORWARD", item.HomePageUrl);
    }

    [Fact]
    public async Task Accepts_an_id3_header_only_when_the_transient_gateway_resolution_declares_an_mp3_object()
    {
        var payload = """
        {
          "schema": "living-nexus-provenance-catalog/1",
          "offset": 0,
          "limit": 50,
          "nextOffset": null,
          "items": [{
            "title": "ID3-backed track",
            "creator": "@Creator",
            "workId": "4",
            "wid": "WID-MUS-ID3",
            "sourceUrl": "https://www.livingnexus.org/share/WID-MUS-ID3",
            "audioUrl": "https://www.livingnexus.org/api/provenance-player/media/4"
          }]
        }
        """;
        var (channel, _) = CreateChannelWithHandler(payload, Id3HeaderOnly);

        var result = await channel.GetChannelItems(new InternalChannelItemQuery(), CancellationToken.None);

        Assert.Equal("mp3", Assert.Single(Assert.Single(result.Items).MediaSources).Container);
    }

    [Fact]
    public async Task Omits_an_id3_header_when_the_transient_gateway_resolution_declares_a_non_mp3_object()
    {
        var payload = """
        {
          "schema": "living-nexus-provenance-catalog/1",
          "offset": 0,
          "limit": 50,
          "nextOffset": null,
          "items": [{
            "title": "WAV object",
            "creator": "@Creator",
            "workId": "5",
            "wid": "WID-MUS-WAV",
            "sourceUrl": "https://www.livingnexus.org/share/WID-MUS-WAV",
            "audioUrl": "https://www.livingnexus.org/api/provenance-player/media/5"
          }]
        }
        """;
        var (channel, _) = CreateChannelWithHandler(
            payload,
            Id3HeaderOnly,
            new Uri("https://storage.example.test/verified.wav"));

        var result = await channel.GetChannelItems(new InternalChannelItemQuery(), CancellationToken.None);

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task Omits_a_gateway_track_when_a_transient_probe_cannot_verify_an_mp3_bitstream()
    {
        var payload = """
        {
          "schema": "living-nexus-provenance-catalog/1",
          "offset": 0,
          "limit": 50,
          "nextOffset": null,
          "items": [{
            "title": "Unknown container",
            "creator": "@Creator",
            "workId": "3",
            "wid": "WID-MUS-UNKNOWN",
            "sourceUrl": "https://www.livingnexus.org/share/WID-MUS-UNKNOWN",
            "audioUrl": "https://www.livingnexus.org/api/provenance-player/media/3"
          }]
        }
        """;
        var (channel, handler) = CreateChannelWithHandler(payload, new byte[] { 0x52, 0x49, 0x46, 0x46 });

        var result = await channel.GetChannelItems(new InternalChannelItemQuery(), CancellationToken.None);

        Assert.Empty(result.Items);
        Assert.True(handler.SawGatewayProbe);
    }

    [Fact]
    public async Task Refuses_raw_storage_and_non_living_nexus_audio_urls_even_if_the_remote_catalog_returns_them()
    {
        var payload = """
        {
          "schema": "living-nexus-provenance-catalog/1",
          "offset": 0,
          "limit": 50,
          "nextOffset": null,
          "items": [{
            "title": "Unsafe",
            "creator": "@Creator",
            "workId": "2",
            "wid": "WID-MUS-UNSAFE",
            "sourceUrl": "https://www.livingnexus.org/share/WID-MUS-UNSAFE",
            "audioUrl": "https://storage.example.test/raw.mp3"
          }]
        }
        """;
        var channel = CreateChannel(payload);

        var result = await channel.GetChannelItems(new InternalChannelItemQuery(), CancellationToken.None);

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task Refuses_an_unknown_catalog_schema()
    {
        var payload = """{ "schema": "unknown/9", "offset": 0, "limit": 1, "items": [] }""";
        var channel = CreateChannel(payload);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            channel.GetChannelItems(new InternalChannelItemQuery(), CancellationToken.None));
    }

    private static LivingNexusChannel CreateChannel(string payload) =>
        CreateChannelWithHandler(payload).Channel;

    private static (LivingNexusChannel Channel, StaticResponseHandler Handler) CreateChannelWithHandler(
        string payload,
        byte[]? mediaBytes = null,
        Uri? resolvedMediaUri = null)
    {
        var handler = new StaticResponseHandler(
            payload,
            mediaBytes ?? Id3HeaderOnly,
            resolvedMediaUri ?? new Uri("https://storage.example.test/verified.mp3"));
        return (new LivingNexusChannel(new FixedHttpClientFactory(new HttpClient(handler))), handler);
    }

    private static readonly byte[] Id3HeaderOnly =
    {
        0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    };

    private static readonly byte[] MpegFrameAtStart =
    {
        0xff, 0xfb, 0x90, 0x64,
    };

    private sealed class StaticResponseHandler : HttpMessageHandler
    {
        private readonly string _payload;
        private readonly byte[] _mediaBytes;
        private readonly Uri _resolvedMediaUri;

        public StaticResponseHandler(string payload, byte[] mediaBytes, Uri resolvedMediaUri)
        {
            _payload = payload;
            _mediaBytes = mediaBytes;
            _resolvedMediaUri = resolvedMediaUri;
        }

        public bool SawGatewayProbe { get; private set; }

        public string? GatewayProbeRange { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath.StartsWith("/api/provenance-player/media/", StringComparison.Ordinal) == true)
            {
                SawGatewayProbe = true;
                GatewayProbeRange = request.Headers.Range?.ToString();
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.PartialContent)
                {
                    // A generic storage MIME response must not be used to invent
                    // the codec; the probe validates the delivered bytes instead.
                    Content = new ByteArrayContent(_mediaBytes),
                    RequestMessage = new HttpRequestMessage(HttpMethod.Get, _resolvedMediaUri),
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_payload, Encoding.UTF8, "application/json"),
            });
        }
    }

    private sealed class FixedHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public FixedHttpClientFactory(HttpClient client) => _client = client;

        public HttpClient CreateClient(string name) => _client;
    }
}
