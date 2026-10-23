using MediaBrowser.Model.Plugins;

namespace LivingNexus.Jellyfin.Configuration;

/// <summary>
/// Deliberately empty: this first integration has no credentials, writable
/// configuration, local library state, or alternate media endpoint.
/// </summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
}
