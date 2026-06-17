using FluentAssertions;
using SkillRegistry.Core.Interfaces;
using SkillRegistry.Core.Models;
using SkillRegistry.Core.Services;
using Xunit;

namespace SkillRegistry.Tests;

public sealed class SkillScorerTests
{
    private readonly SkillScorer _scorer = new();
    private static readonly ValidationResult EmptyResult = new();
    private static readonly IReadOnlyList<SecurityFlag> NoFlags = [];

    private static SkillMetadata CompleteSkill(string id = "my-skill") => new()
    {
        Id = id,
        Path = $"/skills/{id}",
        Name = id,
        Description = "A well-written description that is long enough to pass.",
        Risk = "safe",
        Source = "community",
        DateAdded = "2026-01-01",
        Category = "testing",
        Author = "contributor",
        Tags = ["test", "quality"],
        RawBody =
            "## Overview\nThis skill does something useful.\n\n" +
            "## When to Use\n- Use when testing.\n\n" +
            "## How It Works\nStep by step.\n\n" +
            "## Examples\n```bash\necho hello\n```\n\n" +
            "## Best Practices\n- Do this.\n\n" +
            "## Limitations\n- Test only.\n" +
            new string('x', 1000),
        FullContent =
            $"---\nname: {id}\ndescription: A well-written description.\nrisk: safe\nsource: community\ndate_added: 2026-01-01\n---\n\n" +
            "## Overview\nThis skill does something useful.\n\n" +
            "## When to Use\n- Use when testing.\n\n" +
            "## Examples\n```bash\necho hello\n```\n\n" +
            "## Limitations\n- Test only.\n",
    };

    private static SkillMetadata MinimalSkill(string id = "min-skill") => new()
    {
        Id = id,
        Path = $"/skills/{id}",
        Name = id,
        Description = "Minimal.",
        Risk = "unknown",
        Source = "self",
        RawBody = "## When to Use\n- Use this.\n",
        FullContent = $"---\nname: {id}\ndescription: Minimal.\nrisk: unknown\nsource: self\n---\n\n## When to Use\n- Use this.\n",
    };

    [Fact]
    public void CompleteSkill_ScoresHigh()
    {
        var skill = CompleteSkill();
        var score = _scorer.Score(skill, EmptyResult, EmptyResult, NoFlags);
        score.Scores.Total.Should().BeGreaterThan(65.0);
    }

    [Fact]
    public void MinimalSkill_ScoresLowerThanComplete()
    {
        var complete = _scorer.Score(CompleteSkill(), EmptyResult, EmptyResult, NoFlags);
        var minimal  = _scorer.Score(MinimalSkill(),  EmptyResult, EmptyResult, NoFlags);
        complete.Scores.Total.Should().BeGreaterThan(minimal.Scores.Total);
    }

    [Fact]
    public void SecurityFlags_ReduceSecurityScore()
    {
        var flags = new List<SecurityFlag>
        {
            new() { Code = "SEC002", Severity = "error", Message = "RCE", Line = 1, MatchedText = "curl|bash" },
        };
        var withFlags    = _scorer.Score(MinimalSkill(), EmptyResult, EmptyResult, flags);
        var withoutFlags = _scorer.Score(MinimalSkill(), EmptyResult, EmptyResult, NoFlags);
        withFlags.Scores.Security.Should().BeLessThan(withoutFlags.Scores.Security);
    }

    [Fact]
    public void TotalScore_IsWeightedAverage()
    {
        var skill = CompleteSkill();
        var score = _scorer.Score(skill, EmptyResult, EmptyResult, NoFlags);
        var expected = (score.Scores.Metadata * 0.30)
                     + (score.Scores.Documentation * 0.40)
                     + (score.Scores.Security * 0.30);
        score.Scores.Total.Should().BeApproximately(expected, 0.5);
    }

    [Theory]
    [InlineData(90.0, "excellent")]
    [InlineData(70.0, "good")]
    [InlineData(50.0, "needs_improvement")]
    [InlineData(30.0, "critical")]
    public void ScoreLabel_ReflectsBucket(double score, string expectedLabel)
    {
        ScoreLabels.For(score).Should().Be(expectedLabel);
    }

    [Fact]
    public void AllScoreDimensions_AreClamped0To100()
    {
        var skill = MinimalSkill();
        var score = _scorer.Score(skill, EmptyResult, EmptyResult, NoFlags);
        score.Scores.Metadata.Should().BeInRange(0, 100);
        score.Scores.Documentation.Should().BeInRange(0, 100);
        score.Scores.Security.Should().BeInRange(0, 100);
        score.Scores.Total.Should().BeInRange(0, 100);
    }

    [Fact]
    public void SkillId_PropagatedToScore()
    {
        var skill = CompleteSkill("propagated-id");
        var score = _scorer.Score(skill, EmptyResult, EmptyResult, NoFlags);
        score.SkillId.Should().Be("propagated-id");
    }

    [Fact]
    public void Risk_PropagatedToScore()
    {
        var skill = CompleteSkill();
        var score = _scorer.Score(skill, EmptyResult, EmptyResult, NoFlags);
        score.Risk.Should().Be("safe");
    }
}
