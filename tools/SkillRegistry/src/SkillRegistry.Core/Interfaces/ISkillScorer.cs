using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Interfaces;

public interface ISkillScorer
{
    /// <summary>
    /// Computes a quality score for <paramref name="skill"/> using pre-computed
    /// validation results and security flags.
    /// </summary>
    SkillScore Score(
        SkillMetadata skill,
        ValidationResult metadataResult,
        ValidationResult docResult,
        IReadOnlyList<SecurityFlag> securityFlags);
}
