using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Interfaces;

public sealed record ValidationResult
{
    public IReadOnlyList<string> Errors { get; init; } = [];
    public IReadOnlyList<string> Warnings { get; init; } = [];
    public bool IsValid => Errors.Count == 0;
}

public interface ISkillValidator
{
    /// <summary>Validates frontmatter metadata against the required schema.</summary>
    ValidationResult ValidateMetadata(SkillMetadata skill);

    /// <summary>Validates the documentation structure of the skill body.</summary>
    ValidationResult ValidateDocumentation(SkillMetadata skill);
}
