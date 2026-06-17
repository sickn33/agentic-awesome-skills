using System.Text.RegularExpressions;
using SkillRegistry.Core.Interfaces;
using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Services;

public sealed partial class SkillScorer : ISkillScorer
{
    private const double WeightMetadata = 0.30;
    private const double WeightDocumentation = 0.40;
    private const double WeightSecurity = 0.30;

    private static readonly string[] OptionalBonusFields =
        ["category", "tags", "author", "tools", "license"];

    private static readonly Regex[] DocumentationSections =
    [
        OverviewRegex(),
        HowItWorksRegex(),
        ExamplesRegex(),
        BestPracticesRegex(),
        LimitationsRegex(),
        WhenToUseRegex(),
    ];

    private static readonly Regex FencedCodeBlock = CodeBlockRegex();
    private static readonly Regex WhenToUse = WhenToUsePattern();

    public SkillScore Score(
        SkillMetadata skill,
        ValidationResult metadataResult,
        ValidationResult docResult,
        IReadOnlyList<SecurityFlag> securityFlags)
    {
        var metaScore = ComputeMetadataScore(skill, metadataResult);
        var docScore  = ComputeDocumentationScore(skill, docResult);
        var secScore  = ComputeSecurityScore(skill, securityFlags);

        var total = (metaScore * WeightMetadata)
                  + (docScore  * WeightDocumentation)
                  + (secScore  * WeightSecurity);

        return new SkillScore
        {
            SkillId = skill.Id,
            Risk = skill.Risk,
            Scores = new SkillScore.ScoreDimensions
            {
                Metadata      = Math.Round(metaScore, 1),
                Documentation = Math.Round(docScore,  1),
                Security      = Math.Round(secScore,  1),
                Total         = Math.Round(total,     1),
            },
            Label = ScoreLabels.For(total),
            Flags = securityFlags,
        };
    }

    private static double ComputeMetadataScore(SkillMetadata skill, ValidationResult result)
    {
        var score = 100.0;

        if (string.IsNullOrWhiteSpace(skill.Name) || skill.Name != skill.Id)
            score -= 25;

        if (string.IsNullOrWhiteSpace(skill.Description))
            score -= 20;
        else if (skill.Description.Length < 20)
            score -= 10;

        if (string.IsNullOrWhiteSpace(skill.Risk))
            score -= 15;
        else if (skill.Risk == "unknown")
            score -= 10;

        if (string.IsNullOrWhiteSpace(skill.Source))
            score -= 15;

        if (string.IsNullOrWhiteSpace(skill.DateAdded))
            score -= 10;

        // Bonuses for optional fields (reflection-free check per field)
        if (!string.IsNullOrWhiteSpace(skill.Category)) score += 5;
        if (skill.Tags?.Length > 0)                     score += 5;
        if (!string.IsNullOrWhiteSpace(skill.Author))   score += 5;
        if (skill.Tools?.Length > 0)                    score += 5;
        if (!string.IsNullOrWhiteSpace(skill.License))  score += 5;

        score -= result.Errors.Count   * 10;
        score -= result.Warnings.Count * 3;

        return Math.Clamp(score, 0, 100);
    }

    private static double ComputeDocumentationScore(SkillMetadata skill, ValidationResult result)
    {
        var content = skill.FullContent;
        var body = skill.RawBody;

        var sectionHits = DocumentationSections.Count(p => p.IsMatch(content));
        var sectionScore = (double)sectionHits / DocumentationSections.Length * 60.0;

        var depthScore = 0.0;
        if (WhenToUse.IsMatch(content))          depthScore += 10;
        if (FencedCodeBlock.IsMatch(body))        depthScore += 10;
        if (body.Length >= 500)                   depthScore += 10;
        if (body.Length >= 1000)                  depthScore += 10;

        var score = sectionScore + depthScore;
        score -= result.Errors.Count   * 15;
        score -= result.Warnings.Count * 5;

        return Math.Clamp(score, 0, 100);
    }

    private static double ComputeSecurityScore(SkillMetadata skill, IReadOnlyList<SecurityFlag> flags)
    {
        var score = 100.0;

        foreach (var flag in flags)
        {
            score -= flag.Severity switch
            {
                "error"   => 20,
                "warning" => 10,
                _         => 3,
            };
        }

        if (!string.IsNullOrWhiteSpace(skill.Risk) && skill.Risk != "unknown")
            score = Math.Min(100, score + 5);

        return Math.Clamp(score, 0, 100);
    }

    [GeneratedRegex(@"^##\s+Overview\b",       RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex OverviewRegex();
    [GeneratedRegex(@"^##\s+How\s+It\s+Works\b", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex HowItWorksRegex();
    [GeneratedRegex(@"^##\s+Example(s)?\b",    RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex ExamplesRegex();
    [GeneratedRegex(@"^##\s+Best\s+Practices\b", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex BestPracticesRegex();
    [GeneratedRegex(@"^##\s+Limitations?\b",   RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex LimitationsRegex();
    [GeneratedRegex(@"^##\s+When\s+to\s+Use",  RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex WhenToUseRegex();
    [GeneratedRegex(@"^```",                   RegexOptions.Multiline)]
    private static partial Regex CodeBlockRegex();
    [GeneratedRegex(@"^##\s+When\s+to\s+Use",  RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex WhenToUsePattern();
}
