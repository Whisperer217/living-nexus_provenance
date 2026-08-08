# Living Nexus Roku Channel

This directory is a **native Roku SceneGraph/BrightScript channel**, not a web-page wrapper. It reads the public Living Nexus home feed from `https://www.livingnexus.org/api/v1/roku/home` and presents audio manifestations with their creator, Witness ID, registry timestamp, and optional testimony.

## Source Layout

| Path | Responsibility |
|---|---|
| `manifest` | Roku package metadata and display configuration |
| `source/main.brs` | Launches `MainScene` on the Roku SceneGraph screen |
| `components/MainScene.*` | Home rows, remote interaction, and audio playback coordination |
| `components/ContentLoaderTask.*` | Background HTTPS and JSON loading; it never blocks rendering |
| `components/ArtifactCard.*` | Focus-aware 10-foot artwork and attribution card |
| `components/ArtifactDetail.*` | Read-only creator, WID, registry, and testimony surface |
| `images/` | Reserved for Roku-required channel artwork before store submission |

## First Device Test

Place a Roku device in developer mode, then zip the package contents from inside this directory. Upload the resulting archive through the device's Development Application Installer. Roku's official developer guide documents the remote sequence for developer mode and the browser-based sideloading flow.[1]

```bash
cd roku
zip -r ../living-nexus-roku.zip manifest source components images
```

The first sideload test should verify that the device can load the public feed, show artwork, open a work detail surface with the `OK` button, toggle testimony with `*`, return with `Back`, and begin audio playback only after the user selects a work.

## Production Readiness

Before Streaming Store submission, replace the `images/` placeholder with approved Roku focus and splash artwork, validate every public audio source against target Roku devices, profile memory and startup behavior on physical hardware, and package with the Roku device's application packager. Roku packages are signed and generated through the developer device rather than by a generic local ZIP process.[2]

## References

[1] [Roku Developer: Activating developer mode](https://developer.roku.com/dev/docs/developer-setup)

[2] [Roku Developer: Packaging Roku apps](https://developer.roku.com/dev/docs/packaging-channels)
