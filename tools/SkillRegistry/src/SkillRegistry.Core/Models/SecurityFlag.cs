namespace SkillRegistry.Core.Models;

/// <summary>
/// A security pattern match detected in a skill's body content.
/// </summary>
public sealed record SecurityFlag
{
    public required string Code { get; init; }
    public required string Severity { get; init; }   // error | warning | info
    public required string Message { get; init; }
    public required int Line { get; init; }
    public required string MatchedText { get; init; }
    public string PatternRegex { get; init; } = string.Empty;
}

/// <summary>
/// A named security pattern definition with associated metadata.
/// </summary>
public sealed record SecurityPattern
{
    public required string Code { get; init; }
    public required string Regex { get; init; }
    public required string Severity { get; init; }
    public required string Description { get; init; }
    public required string Rationale { get; init; }
}
