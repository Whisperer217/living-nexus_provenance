using System.Security.Cryptography;
using System.Text.Json;
using LivingNexus.Jellyfin;
using Xunit;

namespace LivingNexus.Jellyfin.Tests;

public sealed class JellyfinRepositoryManifestTests
{
    [Fact]
    public void Declares_one_installable_candidate_that_matches_the_plugin_identity_and_target_abi()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "repository-manifest.json");
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var package = Assert.Single(document.RootElement.EnumerateArray());
        var version = Assert.Single(package.GetProperty("versions").EnumerateArray());

        Assert.Equal(Plugin.PluginGuid, package.GetProperty("guid").GetString());
        Assert.Equal("Living Nexus", package.GetProperty("name").GetString());
        Assert.Equal("Music", package.GetProperty("category").GetString());
        Assert.Equal(typeof(Plugin).Assembly.GetName().Version?.ToString(), version.GetProperty("version").GetString());
        Assert.Equal("12.2.0.0", version.GetProperty("targetAbi").GetString());
        Assert.Matches("^[a-f0-9]{32}$", version.GetProperty("checksum").GetString() ?? string.Empty);

        var sourceUrl = version.GetProperty("sourceUrl").GetString();
        Assert.Equal(
            "https://github.com/Whisperer217/living-nexus_provenance/releases/download/jellyfin-v0.1.0.0/living-nexus_0.1.0.0.zip",
            sourceUrl);
        Assert.True(Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri));
        Assert.Equal(Uri.UriSchemeHttps, uri!.Scheme);
    }
}
