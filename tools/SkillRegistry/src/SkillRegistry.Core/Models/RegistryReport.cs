namespace SkillRegistry.Core.Models;

/// <summary>
/// Consolidated health report for the entire skill registry.
/// Serialized to data/registry-report.json.
/// </summary>
public sealed record RegistryReport
{
    public int SchemaVersion { get; init; } = 1;
    public DateTimeOffset GeneratedAt { get; init; } = DateTimeOffset.UtcNow;
    public required string SkillsVersion { get; init; }
    public required RegistrySummary Summary { get; init; }
    public IReadOnlyList<SkillScore> Skills { get; init; } = [];
    public DriftSummary? Drift { get; init; }
}

public sealed record RegistrySummary
{
    public int TotalSkills { get; init; }
    public double AverageScore { get; init; }
    public double MinScore { get; init; }
    public double MaxScore { get; init; }
    public required ScoreDistribution ScoreDistribution { get; init; }
    public IReadOnlyList<RiskCount> RiskBreakdown { get; init; } = [];
    public required SecuritySummary Security { get; init; }
}

public sealed record ScoreDistribution
{
    public int Excellent { get; init; }
    public int Good { get; init; }
    public int NeedsImprovement { get; init; }
    public int Critical { get; init; }
}

public sealed record RiskCount(string Risk, int Count);

public sealed record SecuritySummary
{
    public int FlagErrors { get; init; }
    public int FlagWarnings { get; init; }
}

public sealed record DriftSummary
{
    public bool HasDrift { get; init; }
    public IReadOnlyList<string> Added { get; init; } = [];
    public IReadOnlyList<string> Removed { get; init; } = [];
    public IReadOnlyList<DriftedSkill> Drifted { get; init; } = [];
    public int UnchangedCount { get; init; }
}

public sealed record DriftedSkill(string SkillId, string OldHash, string NewHash);
