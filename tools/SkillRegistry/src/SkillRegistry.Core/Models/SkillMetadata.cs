namespace SkillRegistry.Core.Models;

/// <summary>
/// Parsed frontmatter and body content of a SKILL.md file.
/// </summary>
public sealed record SkillMetadata
{
    public required string Id { get; init; }
    public required string Path { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required string Risk { get; init; }
    public required string Source { get; init; }
    public string? DateAdded { get; init; }
    public string? Category { get; init; }
    public string? Author { get; init; }
    public string[]? Tags { get; init; }
    public string[]? Tools { get; init; }
    public string? SourceRepo { get; init; }
    public string? SourceType { get; init; }
    public string? License { get; init; }

    /// <summary>Raw markdown body (frontmatter stripped).</summary>
    public string RawBody { get; init; } = string.Empty;

    /// <summary>Full SKILL.md content including frontmatter.</summary>
    public string FullContent { get; init; } = string.Empty;
}
