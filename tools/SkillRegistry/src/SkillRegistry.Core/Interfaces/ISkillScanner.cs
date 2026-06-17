using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Interfaces;

public interface ISkillScanner
{
    /// <summary>
    /// Enumerates skill directory paths under <paramref name="rootPath"/>.
    /// Only directories containing a SKILL.md are yielded.
    /// </summary>
    IAsyncEnumerable<string> ScanAsync(
        string rootPath,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads and parses the SKILL.md at <paramref name="skillPath"/>.
    /// Returns <c>null</c> if the file is absent or unparseable.
    /// </summary>
    Task<SkillMetadata?> ReadSkillAsync(
        string skillPath,
        CancellationToken cancellationToken = default);
}
