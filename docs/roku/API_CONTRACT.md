# Living Nexus Roku Feed Contract v1

## Endpoint

The Roku channel reads one public, cacheable home document:

```text
GET https://www.livingnexus.org/api/v1/roku/home
```

The endpoint returns `application/json; charset=utf-8` with a brief cache lifetime and uses absolute HTTPS URLs. It is a **read-only projection** of published, public audio manifestations. The canonical WID route remains authoritative for deeper verification.

## Response Shape

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-08-08T19:00:00.000Z",
  "platform": {
    "name": "Living Nexus",
    "tagline": "A living registry of human creative contribution.",
    "websiteUrl": "https://www.livingnexus.org"
  },
  "rows": [
    {
      "id": "new-witnesses",
      "title": "New Witnesses",
      "description": "Recently published audio manifestations with verifiable origin.",
      "items": [
        {
          "id": "ln-song-123",
          "title": "Work title",
          "shortDescription": "@creator · Electronic",
          "contentType": "audio",
          "streamFormat": "mp3",
          "hdPosterUrl": "https://cdn.example/cover.jpg",
          "sdPosterUrl": "https://cdn.example/cover.jpg",
          "streamUrl": "https://www.livingnexus.org/api/v1/stream/123",
          "detailUrl": "https://www.livingnexus.org/api/v1/track/123",
          "creator": {
            "id": 88,
            "name": "Creator name",
            "handle": "@creator",
            "profileUrl": "https://www.livingnexus.org/creator/creator"
          },
          "provenance": {
            "witnessId": "WID-MUS-EXAMPLE",
            "verificationStatus": "verified",
            "registeredAt": "2026-08-08T18:00:00.000Z",
            "verificationUrl": "https://www.livingnexus.org/api/v1/wid/WID-MUS-EXAMPLE",
            "webVerifyUrl": "https://www.livingnexus.org/verify/WID-MUS-EXAMPLE",
            "originStory": "Optional creator testimony."
          },
          "metadata": {
            "genre": "Electronic",
            "durationSeconds": 234,
            "aiDisclosure": "original"
          }
        }
      ]
    }
  ]
}
```

## Field Rules

| Field | Rule | Roku use |
|---|---|---|
| `schemaVersion` | Required; currently `1.0` | Allows future non-breaking client behavior |
| `rows` | Required; 1–3 rows, each with at most 12 items | Maps directly to a Roku `RowList` content tree |
| `streamUrl` | Required for every emitted item; absolute HTTPS URL | Assigned to the Roku `Audio` node only after user confirmation |
| `hdPosterUrl` / `sdPosterUrl` | Optional; null when no art is available | Enables standard Roku artwork display with a safe fallback panel |
| `creator` | Required | Appears on focused card and detail panel before playback is initiated |
| `provenance.witnessId` | Nullable, never generated or changed by the feed | Displays as an immutable `WID` seal |
| `provenance.originStory` | Optional, publication-controlled excerpt | Enables the **Testimony** detail panel, never an editable field |
| `verificationUrl` | Nullable but absolute when a WID exists | Reads the canonical public registry record |
| `metadata` | Optional, bounded scalar fields only | Supplemental detail text; no raw provenance graph payloads |

## Home Composition

The server projects a deterministic, cacheable home screen instead of asking Roku to calculate rankings or traverse registry records. It emits recent released works as **New Witnesses**, high-listened works as **Honored Works**, and a small selection of genre-defined audio rows when available. Each row is bounded to support predictable memory use on Roku hardware.

## Remote-Control Experience

| Remote action | Home scene | Detail/player surface |
|---|---|---|
| Direction pad | Moves through rows and works using native `RowList` focus | Moves between **Play**, **Testimony**, and **WID** actions |
| OK | Opens the selected work detail | Begins or toggles audio playback; opens selected provenance panel |
| Star (`*`) | Opens the selected work’s provenance summary | Toggles the provenance summary when available |
| Back | Leaves detail or exits if home has focus | Stops detail focus and returns to the selected home card |

## Channel Package Shape

```text
roku/
  manifest
  source/main.brs
  components/
    MainScene.xml
    MainScene.brs
    ContentLoaderTask.xml
    ContentLoaderTask.brs
    ArtifactDetail.xml
    ArtifactDetail.brs
  images/
  README.md
```

The channel layout follows Roku's required SceneGraph package convention and uses a Task node to keep network and JSON processing off the UI render thread.[1] The first release avoids storing catalog data in the device registry; the network service remains the source of truth for WID and provenance content.

## References

[1] [Roku Developer: Developing SceneGraph applications](https://developer.roku.com/dev/docs/developing-scenegraph-applications)

[2] [Roku Developer: Task node](https://developer.roku.com/dev/docs/task)
