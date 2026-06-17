using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Interfaces;

public interface ISecurityScanner
{
    /// <summary>
    /// Scans <paramref name="skill"/> body for dangerous command patterns.
    /// </summary>
    IReadOnlyList<SecurityFlag> Scan(SkillMetadata skill);

    /// <summary>Returns all registered security patterns.</summary>
    IReadOnlyList<SecurityPattern> GetPatterns();
}
