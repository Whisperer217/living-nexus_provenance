using System.Net;
using System.Text;
using LivingNexus.Jellyfin.Channel;
using MediaBrowser.Controller.Channels;
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
        var channel = CreateChannel(payload);

        var result = await channel.GetChannelItems(new InternalChannelItemQuery { StartIndex = 0, Limit = 50 }, CancellationToken.None);

        var item = Assert.Single(result.Items);
        Assert.Equal("Push Forward", item.Name);
        Assert.Equal("@DocSMercer", Assert.Single(item.Artists));
        Assert.Equal("WID-MUS-PUSH-FORWARD", item.ProviderIds["LivingNexusWID"]);
        var source = Assert.Single(item.MediaSources);
        Assert.Equal("https://www.livingnexus.org/api/provenance-player/media/60001", source.Path);
        Assert.True(source.IsRemote);
        Assert.Equal("https://www.livingnexus.org/share/WID-MUS-PUSH-FORWARD", item.HomePageUrl);
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
        new(new FixedHttpClientFactory(new HttpClient(new StaticResponseHandler(payload))));

    private sealed class StaticResponseHandler : HttpMessageHandler
    {
        private readonly string _payload;

        public StaticResponseHandler(string payload) => _payload = payload;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_payload, Encoding.UTF8, "application/json"),
            });
    }

    private sealed class FixedHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public FixedHttpClientFactory(HttpClient client) => _client = client;

        public HttpClient CreateClient(string name) => _client;
    }
}
