using System.Runtime.CompilerServices;
using SkillRegistry.Core.Interfaces;
using SkillRegistry.Core.Models;
using YamlDotNet.RepresentationModel;

namespace SkillRegistry.Core.Services;

public sealed class SkillScanner : ISkillScanner
{
    private const string SkillFileName = "SKILL.md";
    private const string FrontmatterDelimiter = "---";

    public async IAsyncEnumerable<string> ScanAsync(
        string rootPath,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        foreach (var dir in Directory.EnumerateDirectories(rootPath, "*", SearchOption.TopDirectoryOnly)
                                     .OrderBy(d => d, StringComparer.OrdinalIgnoreCase))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (Path.GetFileName(dir).StartsWith('.'))
                continue;
            if (File.Exists(Path.Combine(dir, SkillFileName)))
                yield return dir;
        }
        await Task.CompletedTask;
    }

    public async Task<SkillMetadata?> ReadSkillAsync(
        string skillPath,
        CancellationToken cancellationToken = default)
    {
        var skillFile = Path.Combine(skillPath, SkillFileName);
        if (!File.Exists(skillFile))
            return null;

        var content = await File.ReadAllTextAsync(skillFile, cancellationToken);
        var (frontmatter, body) = ParseFrontmatter(content);
        if (frontmatter is null)
            return null;

        var root = ParseYaml(frontmatter);
        if (root is null)
            return null;

        return new SkillMetadata
        {
            Id = Path.GetFileName(skillPath),
            Path = skillPath,
            Name = GetString(root, "name") ?? string.Empty,
            Description = GetString(root, "description") ?? string.Empty,
            Risk = GetString(root, "risk") ?? "unknown",
            Source = GetString(root, "source") ?? string.Empty,
            DateAdded = GetString(root, "date_added"),
            Category = GetString(root, "category"),
            Author = GetString(root, "author"),
            Tags = GetStringArray(root, "tags"),
            Tools = GetStringArray(root, "tools"),
            SourceRepo = GetString(root, "source_repo"),
            SourceType = GetString(root, "source_type"),
            License = GetString(root, "license"),
            RawBody = body ?? string.Empty,
            FullContent = content,
        };
    }

    private static (string? Frontmatter, string? Body) ParseFrontmatter(string content)
    {
        if (!content.TrimStart().StartsWith(FrontmatterDelimiter, StringComparison.Ordinal))
            return (null, content);

        var firstEnd = content.IndexOf('\n', 0);
        if (firstEnd < 0)
            return (null, content);

        var secondStart = content.IndexOf(
            $"\n{FrontmatterDelimiter}",
            firstEnd,
            StringComparison.Ordinal);

        if (secondStart < 0)
            return (null, content);

        var frontmatter = content[(firstEnd + 1)..secondStart].Trim();
        var bodyStart = secondStart + FrontmatterDelimiter.Length + 1;
        var body = bodyStart < content.Length
            ? content[bodyStart..].TrimStart('\n')
            : string.Empty;

        return (frontmatter, body);
    }

    private static YamlMappingNode? ParseYaml(string yaml)
    {
        try
        {
            var stream = new YamlStream();
            stream.Load(new StringReader(yaml));
            return stream.Documents.Count > 0
                ? stream.Documents[0].RootNode as YamlMappingNode
                : null;
        }
        catch
        {
            return null;
        }
    }

    private static string? GetString(YamlMappingNode node, string key) =>
        node.Children.TryGetValue(new YamlScalarNode(key), out var value)
            ? value?.ToString()
            : null;

    private static string[]? GetStringArray(YamlMappingNode node, string key) =>
        node.Children.TryGetValue(new YamlScalarNode(key), out var value)
        && value is YamlSequenceNode seq
            ? seq.Children
                 .Select(c => c.ToString() ?? string.Empty)
                 .Where(s => !string.IsNullOrEmpty(s))
                 .ToArray()
            : null;
}
