# Living Nexus Roku Channel — Device Test and Release Guide

## Scope

This guide covers the native `roku/` package. The live Living Nexus website remains the channel's source of truth for the public Roku feed at `/api/v1/roku/home`; the Roku archive only contains SceneGraph components and does not copy the catalog database.

## Local Device Test

First enroll in the Roku developer program and place a non-production Roku device in developer mode. Roku documents the device-side remote sequence, the required developer tools agreement, and the browser-based Development Application Installer.[1]

| Step | Action | Expected outcome |
|---|---|---|
| 1 | On the Roku remote, press `Home` three times, `Up` twice, then `Right`, `Left`, `Right`, `Left`, `Right`. | The developer-mode screen shows the device URL. |
| 2 | Enable the Development Application Installer and set the device password. | The Roku restarts in developer mode. |
| 3 | From the repository root, create the source archive with `cd roku && zip -r ../living-nexus-roku.zip manifest source components images`. | A development archive contains the manifest, SceneGraph XML, BrightScript, and image directory. |
| 4 | Open `http://<roku-device-ip>` in a local browser, authenticate, and upload the archive through the Development Application Installer. | The channel starts as the device’s one active sideloaded application. |
| 5 | Test directional focus, `OK` for detail and playback, `*` for testimony/provenance, and `Back` to return. | The remote-first experience remains understandable and no mutation UI is exposed. |

Only one sideloaded app can reside on a Roku device at a time, so uploading another development archive replaces the current sideloaded application.[1]

## Release Validation

Before package generation, verify the following evidence rather than assuming that a browser preview proves device behavior.

| Gate | Evidence required |
|---|---|
| Roku feed | `GET /api/v1/roku/home` returns `schemaVersion: "1.0"`, 1–3 rows, and absolute HTTPS playback URLs in production. |
| Attribution | Every displayed work includes creator information; WID values are shown when present and never editable. |
| Playback | Test the production media formats on the oldest Roku devices supported by the release policy. |
| Remote navigation | Confirm no focus trap occurs when entering detail, toggling provenance with `*`, or returning with `Back`. |
| Network resilience | Confirm an unavailable feed produces the visible channel status message rather than a frozen screen. |
| Store assets | Replace `roku/images/.gitkeep` with approved channel focus, side, and splash artwork sized to Roku's current publishing requirements. |
| Performance | Use Roku device profiling and screenshots to check startup, memory, UI responsiveness, and focal states. |

## Packaging and Submission

Roku distribution packages are generated and encrypted through the developer device’s Application Packager. The device must be linked to the Roku developer account and online. A signing key is created with the device’s `genkey` facility; protect both the developer ID and generated password because future updates must use the same signing identity to preserve any channel registry data.[2]

The ZIP archive supplied by this repository is intended for **development sideloading**. A Streaming Store submission must use the Roku-generated package from the device, current store metadata and graphics, completed certification testing, and an assigned content/support owner. The first release does not require account linking, Roku Pay, or device registry persistence because it exposes a public, read-only catalog.

## Post-Release Operations

The channel backend ships with the Living Nexus web service. Normal site publishing automatically updates the Roku feed without repackaging the client unless the `schemaVersion` or client behavior changes. Keep the existing `/api/v1/wid/:wid` record as the canonical reference for provenance; the Roku feed is a presentation projection only.

## References

[1] [Roku Developer: Activating developer mode](https://developer.roku.com/dev/docs/developer-setup)

[2] [Roku Developer: Packaging Roku apps](https://developer.roku.com/dev/docs/packaging-channels)
