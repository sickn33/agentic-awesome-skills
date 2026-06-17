using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Interfaces;

public interface IRegistryReporter
{
    /// <summary>Generates a consolidated health report from a list of skill scores.</summary>
    Task<RegistryReport> GenerateAsync(
        IReadOnlyList<SkillScore> scores,
        string skillsVersion,
        DriftSummary? drift = null,
        CancellationToken cancellationToken = default);

    /// <summary>Serializes <paramref name="report"/> as JSON to <paramref name="outputPath"/>.</summary>
    Task WriteAsync(
        RegistryReport report,
        string outputPath,
        CancellationToken cancellationToken = default);
}
