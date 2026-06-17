namespace SkillRegistry.Core.Models;

/// <summary>
/// Quality score for a single skill computed across three weighted dimensions.
/// </summary>
public sealed record SkillScore
{
    public required string SkillId { get; init; }
    public required string Risk { get; init; }
    public required ScoreDimensions Scores { get; init; }
    public required string Label { get; init; }
    public IReadOnlyList<SecurityFlag> Flags { get; init; } = [];
    public DateTimeOffset ComputedAt { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Score dimensions with their individual values.
    /// Weights: Metadata 30%, Documentation 40%, Security 30%.
    /// </summary>
    public sealed record ScoreDimensions
    {
        public required double Metadata { get; init; }
        public required double Documentation { get; init; }
        public required double Security { get; init; }
        public required double Total { get; init; }
    }
}

/// <summary>Quality label thresholds.</summary>
public static class ScoreLabels
{
    public const double Excellent = 85.0;
    public const double Good = 65.0;
    public const double NeedsImprovement = 45.0;

    public static string For(double score) => score switch
    {
        >= Excellent        => "excellent",
        >= Good             => "good",
        >= NeedsImprovement => "needs_improvement",
        _                   => "critical",
    };
}
