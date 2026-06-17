using System.Text.RegularExpressions;
using SkillRegistry.Core.Interfaces;
using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Services;

public sealed partial class SkillValidator : ISkillValidator
{
    private static readonly HashSet<string> ValidRisks =
        ["none", "safe", "critical", "offensive", "unknown"];

    private static readonly Regex DatePattern = DateRegex();
    private static readonly Regex SourceRepoPattern = SourceRepoRegex();

    private static readonly Regex[] WhenToUsePatterns =
    [
        WhenToUseRegex1(),
        WhenToUseRegex2(),
        WhenToUseRegex3(),
    ];

    private static readonly Regex[] LimitationsPatterns =
    [
        LimitationsRegex1(),
        LimitationsRegex2(),
    ];

    public ValidationResult ValidateMetadata(SkillMetadata skill)
    {
        var errors = new List<string>();
        var warnings = new List<string>();

        if (string.IsNullOrWhiteSpace(skill.Name))
            errors.Add("Missing 'name' in frontmatter.");
        else if (skill.Name != skill.Id)
            errors.Add($"Name '{skill.Name}' does not match folder name '{skill.Id}'.");

        if (string.IsNullOrWhiteSpace(skill.Description))
            errors.Add("Missing 'description' in frontmatter.");
        else if (skill.Description.Length > 300)
            errors.Add($"Description is too long ({skill.Description.Length} chars). Maximum is 300.");

        if (string.IsNullOrWhiteSpace(skill.Risk))
            warnings.Add("Missing 'risk' label.");
        else if (!ValidRisks.Contains(skill.Risk))
            errors.Add($"Invalid risk level '{skill.Risk}'. Must be one of: {string.Join(", ", ValidRisks)}.");

        if (string.IsNullOrWhiteSpace(skill.Source))
            warnings.Add("Missing 'source' attribution.");

        if (skill.DateAdded is not null && !DatePattern.IsMatch(skill.DateAdded))
            errors.Add($"Invalid 'date_added' format. Expected YYYY-MM-DD, got '{skill.DateAdded}'.");

        if (skill.SourceRepo is not null && !SourceRepoPattern.IsMatch(skill.SourceRepo))
            errors.Add($"Invalid 'source_repo' format. Expected OWNER/REPO, got '{skill.SourceRepo}'.");

        return new ValidationResult { Errors = errors, Warnings = warnings };
    }

    public ValidationResult ValidateDocumentation(SkillMetadata skill)
    {
        var warnings = new List<string>();
        var content = skill.FullContent;

        if (!WhenToUsePatterns.Any(p => p.IsMatch(content)))
            warnings.Add("Missing '## When to Use' section.");

        if (!LimitationsPatterns.Any(p => p.IsMatch(content)))
            warnings.Add("Missing '## Limitations' section.");

        if (skill.Risk == "offensive" && !content.Contains("AUTHORIZED USE ONLY", StringComparison.OrdinalIgnoreCase))
            return new ValidationResult
            {
                Errors = ["OFFENSIVE SKILL MISSING SECURITY DISCLAIMER (must contain 'AUTHORIZED USE ONLY')."],
                Warnings = warnings,
            };

        return new ValidationResult { Errors = [], Warnings = warnings };
    }

    [GeneratedRegex(@"^\d{4}-\d{2}-\d{2}$")]
    private static partial Regex DateRegex();

    [GeneratedRegex(@"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")]
    private static partial Regex SourceRepoRegex();

    [GeneratedRegex(@"^##\s+When\s+to\s+Use", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex WhenToUseRegex1();

    [GeneratedRegex(@"^##\s+Use\s+this\s+skill\s+when", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex WhenToUseRegex2();

    [GeneratedRegex(@"^##\s+When\s+to\s+activate", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex WhenToUseRegex3();

    [GeneratedRegex(@"^##\s+Limitations?\b", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex LimitationsRegex1();

    [GeneratedRegex(@"^##\s+Out\s+of\s+Scope\b", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex LimitationsRegex2();
}
