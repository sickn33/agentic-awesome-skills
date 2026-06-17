using FluentAssertions;
using SkillRegistry.Core.Models;
using SkillRegistry.Core.Services;
using Xunit;

namespace SkillRegistry.Tests;

public sealed class SkillValidatorTests
{
    private readonly SkillValidator _validator = new();

    private static SkillMetadata ValidSkill(string id = "good-skill") => new()
    {
        Id = id,
        Path = $"/skills/{id}",
        Name = id,
        Description = "A valid skill description within limits.",
        Risk = "safe",
        Source = "community",
        DateAdded = "2026-01-01",
        RawBody = "## When to Use\n- Use this.\n\n## Limitations\n- None.\n",
        FullContent =
            $"---\nname: {id}\ndescription: A valid description.\nrisk: safe\nsource: community\ndate_added: 2026-01-01\n---\n\n" +
            "## When to Use\n- Use this.\n\n## Limitations\n- None.\n",
    };

    // ── Metadata validation ──────────────────────────────────────────────────

    [Fact]
    public void ValidSkill_HasNoMetadataErrors()
    {
        var result = _validator.ValidateMetadata(ValidSkill());
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void MissingName_ProducesError()
    {
        var skill = ValidSkill() with { Name = string.Empty };
        _validator.ValidateMetadata(skill).Errors.Should().NotBeEmpty();
    }

    [Fact]
    public void NameMismatch_ProducesError()
    {
        var skill = ValidSkill() with { Name = "wrong-name" };
        _validator.ValidateMetadata(skill).Errors.Should().Contain(e => e.Contains("does not match"));
    }

    [Fact]
    public void MissingDescription_ProducesError()
    {
        var skill = ValidSkill() with { Description = string.Empty };
        _validator.ValidateMetadata(skill).Errors.Should().Contain(e => e.Contains("description"));
    }

    [Fact]
    public void DescriptionTooLong_ProducesError()
    {
        var skill = ValidSkill() with { Description = new string('x', 301) };
        _validator.ValidateMetadata(skill).Errors.Should().Contain(e => e.Contains("too long"));
    }

    [Fact]
    public void InvalidRisk_ProducesError()
    {
        var skill = ValidSkill() with { Risk = "super-risky" };
        _validator.ValidateMetadata(skill).Errors.Should().Contain(e => e.Contains("Invalid risk"));
    }

    [Fact]
    public void InvalidDateFormat_ProducesError()
    {
        var skill = ValidSkill() with { DateAdded = "01/15/2026" };
        _validator.ValidateMetadata(skill).Errors.Should().Contain(e => e.Contains("date_added"));
    }

    [Fact]
    public void ValidDate_ProducesNoError()
    {
        var skill = ValidSkill() with { DateAdded = "2026-06-15" };
        _validator.ValidateMetadata(skill).Errors.Should().NotContain(e => e.Contains("date_added"));
    }

    [Theory]
    [InlineData("none")]
    [InlineData("safe")]
    [InlineData("critical")]
    [InlineData("offensive")]
    [InlineData("unknown")]
    public void ValidRiskLevel_ProducesNoRiskError(string risk)
    {
        var skill = ValidSkill() with { Risk = risk };
        _validator.ValidateMetadata(skill).Errors.Should().NotContain(e => e.Contains("Invalid risk"));
    }

    [Fact]
    public void InvalidSourceRepo_ProducesError()
    {
        var skill = ValidSkill() with { SourceRepo = "not-a-valid-repo" };
        _validator.ValidateMetadata(skill).Errors.Should().Contain(e => e.Contains("source_repo"));
    }

    [Fact]
    public void ValidSourceRepo_ProducesNoError()
    {
        var skill = ValidSkill() with { SourceRepo = "owner/repo-name" };
        _validator.ValidateMetadata(skill).Errors.Should().NotContain(e => e.Contains("source_repo"));
    }

    // ── Documentation validation ─────────────────────────────────────────────

    [Fact]
    public void ValidDocumentation_ProducesNoWarnings()
    {
        var result = _validator.ValidateDocumentation(ValidSkill());
        result.Warnings.Should().BeEmpty();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void MissingWhenToUse_ProducesWarning()
    {
        var skill = ValidSkill() with
        {
            FullContent = "---\nname: good-skill\nrisk: safe\n---\n\n## Limitations\n- None.\n",
        };
        _validator.ValidateDocumentation(skill).Warnings.Should().Contain(w => w.Contains("When to Use"));
    }

    [Fact]
    public void MissingLimitations_ProducesWarning()
    {
        var skill = ValidSkill() with
        {
            FullContent = "---\nname: good-skill\nrisk: safe\n---\n\n## When to Use\n- Use this.\n",
        };
        _validator.ValidateDocumentation(skill).Warnings.Should().Contain(w => w.Contains("Limitations"));
    }

    [Fact]
    public void OffensiveSkillWithoutDisclaimer_ProducesError()
    {
        var skill = ValidSkill() with
        {
            Risk = "offensive",
            FullContent = "---\nname: good-skill\nrisk: offensive\n---\n\n## When to Use\n- Use.\n\n## Limitations\n- None.\n",
        };
        _validator.ValidateDocumentation(skill).Errors.Should().Contain(e => e.Contains("AUTHORIZED USE ONLY"));
    }

    [Fact]
    public void OffensiveSkillWithDisclaimer_ProducesNoError()
    {
        var skill = ValidSkill() with
        {
            Risk = "offensive",
            FullContent =
                "---\nname: good-skill\nrisk: offensive\n---\n\n" +
                "AUTHORIZED USE ONLY\n\n" +
                "## When to Use\n- Use.\n\n## Limitations\n- None.\n",
        };
        _validator.ValidateDocumentation(skill).Errors.Should().NotContain(e => e.Contains("AUTHORIZED USE ONLY"));
    }
}
