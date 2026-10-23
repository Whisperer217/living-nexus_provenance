using LivingNexus.Jellyfin.Channel;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Channels;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace LivingNexus.Jellyfin;

/// <summary>
/// Registers the read-only Living Nexus channel with Jellyfin's native channel manager.
/// </summary>
public sealed class LivingNexusServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddSingleton<IChannel, LivingNexusChannel>();
    }
}
