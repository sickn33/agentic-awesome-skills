using System.Text.Json;
using System.Text.Json.Serialization;
using SkillRegistry.Core.Interfaces;
using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Services;

public sealed class RegistryReporter : IRegistryReporter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public Task<RegistryReport> GenerateAsync(
        IReadOnlyList<SkillScore> scores,
        string skillsVersion,
        DriftSummary? drift = null,
        CancellationToken cancellationToken = default)
    {
        var summary = BuildSummary(scores);
        var report = new RegistryReport
        {
            SkillsVersion = skillsVersion,
            Summary = summary,
            Skills = scores.OrderBy(s => s.Scores.Total).ToList(),
            Drift = drift,
        };
        return Task.FromResult(report);
    }

    public async Task WriteAsync(
        RegistryReport report,
        string outputPath,
        CancellationToken cancellationToken = default)
    {
        var dir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        await using var stream = File.Create(outputPath);
        await JsonSerializer.SerializeAsync(stream, report, JsonOptions, cancellationToken);
    }

    private static RegistrySummary BuildSummary(IReadOnlyList<SkillScore> scores)
    {
        if (scores.Count == 0)
        {
            return new RegistrySummary
            {
                ScoreDistribution = new ScoreDistribution(),
                Security = new SecuritySummary(),
            };
        }

        var totals = scores.Select(s => s.Scores.Total).ToList();
        var dist = new ScoreDistribution
        {
            Excellent        = scores.Count(s => s.Label == "excellent"),
            Good             = scores.Count(s => s.Label == "good"),
            NeedsImprovement = scores.Count(s => s.Label == "needs_improvement"),
            Critical         = scores.Count(s => s.Label == "critical"),
        };

        var riskBreakdown = scores
            .GroupBy(s => s.Risk)
            .Select(g => new RiskCount(g.Key, g.Count()))
            .OrderByDescending(r => r.Count)
            .ToList();

        var flagErrors   = scores.Sum(s => s.Flags.Count(f => f.Severity == "error"));
        var flagWarnings = scores.Sum(s => s.Flags.Count(f => f.Severity == "warning"));

        return new RegistrySummary
        {
            TotalSkills       = scores.Count,
            AverageScore      = Math.Round(totals.Average(), 1),
            MinScore          = Math.Round(totals.Min(), 1),
            MaxScore          = Math.Round(totals.Max(), 1),
            ScoreDistribution = dist,
            RiskBreakdown     = riskBreakdown,
            Security = new SecuritySummary
            {
                FlagErrors   = flagErrors,
                FlagWarnings = flagWarnings,
            },
        };
    }
}
