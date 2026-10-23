using LivingNexus.Jellyfin.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Serialization;

namespace LivingNexus.Jellyfin;

/// <summary>
/// Package identity for the read-only Living Nexus Remote Channel.
/// </summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>
{
    public const string PluginGuid = "4bb75dc8-b3db-4bd7-8db3-4e16d378d84e";

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
    }

    public override string Name => "Living Nexus";

    public override Guid Id => Guid.Parse(PluginGuid);
}
