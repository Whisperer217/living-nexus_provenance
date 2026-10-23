using System.Text.Json.Serialization;

namespace LivingNexus.Jellyfin.Models;

internal sealed class PortableWitnessCatalog
{
    [JsonPropertyName("schema")]
    public string Schema { get; init; } = string.Empty;

    [JsonPropertyName("offset")]
    public int Offset { get; init; }

    [JsonPropertyName("limit")]
    public int Limit { get; init; }

    [JsonPropertyName("nextOffset")]
    public int? NextOffset { get; init; }

    [JsonPropertyName("items")]
    public IReadOnlyList<PortableWitnessTrack> Items { get; init; } = Array.Empty<PortableWitnessTrack>();
}

internal sealed class PortableWitnessTrack
{
    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("creator")]
    public string Creator { get; init; } = string.Empty;

    [JsonPropertyName("artworkUrl")]
    public string? ArtworkUrl { get; init; }

    [JsonPropertyName("audioUrl")]
    public string AudioUrl { get; init; } = string.Empty;

    [JsonPropertyName("workId")]
    public string WorkId { get; init; } = string.Empty;

    [JsonPropertyName("wid")]
    public string Wid { get; init; } = string.Empty;

    [JsonPropertyName("sourceUrl")]
    public string SourceUrl { get; init; } = string.Empty;

    [JsonPropertyName("participation")]
    public PortableWitnessParticipation? Participation { get; init; }
}

internal sealed class PortableWitnessParticipation
{
    [JsonPropertyName("music")]
    public string? Music { get; init; }

    [JsonPropertyName("lyrics")]
    public string? Lyrics { get; init; }

    [JsonPropertyName("voice")]
    public string? Voice { get; init; }
}
