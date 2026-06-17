using FluentAssertions;
using SkillRegistry.Core.Services;
using Xunit;

namespace SkillRegistry.Tests;

public sealed class SkillScannerTests : IDisposable
{
    private readonly SkillScanner _scanner = new();
    private readonly string _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    public SkillScannerTests() => Directory.CreateDirectory(_tempDir);

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    private string CreateSkill(string name, string? content = null)
    {
        var skillDir = Path.Combine(_tempDir, name);
        Directory.CreateDirectory(skillDir);
        var body = content ?? $"""
            ---
            name: {name}
            description: Test skill
            risk: safe
            source: community
            date_added: 2026-01-01
            ---

            ## When to Use
            - Use in tests.

            ## Limitations
            - Test only.
            """;
        File.WriteAllText(Path.Combine(skillDir, "SKILL.md"), body);
        return skillDir;
    }

    [Fact]
    public async Task ScanAsync_YieldsOnlyDirectoriesWithSkillMd()
    {
        CreateSkill("skill-a");
        CreateSkill("skill-b");
        var noSkill = Path.Combine(_tempDir, "no-skill-md");
        Directory.CreateDirectory(noSkill);

        var found = new List<string>();
        await foreach (var path in _scanner.ScanAsync(_tempDir))
            found.Add(Path.GetFileName(path));

        found.Should().Contain("skill-a").And.Contain("skill-b");
        found.Should().NotContain("no-skill-md");
    }

    [Fact]
    public async Task ScanAsync_IgnoresHiddenDirectories()
    {
        CreateSkill("visible-skill");
        var hidden = Path.Combine(_tempDir, ".hidden");
        Directory.CreateDirectory(hidden);
        File.WriteAllText(Path.Combine(hidden, "SKILL.md"), "---\nname: hidden\n---\n");

        var found = new List<string>();
        await foreach (var path in _scanner.ScanAsync(_tempDir))
            found.Add(Path.GetFileName(path));

        found.Should().Contain("visible-skill");
        found.Should().NotContain(".hidden");
    }

    [Fact]
    public async Task ReadSkillAsync_ParsesAllRequiredFields()
    {
        CreateSkill("parse-skill", """
            ---
            name: parse-skill
            description: Testing field parsing.
            risk: safe
            source: community
            date_added: 2026-01-01
            category: testing
            author: test-author
            tags:
              - tag-a
              - tag-b
            ---

            ## When to Use
            - Use in parsing tests.
            """);

        var skill = await _scanner.ReadSkillAsync(Path.Combine(_tempDir, "parse-skill"));

        skill.Should().NotBeNull();
        skill!.Id.Should().Be("parse-skill");
        skill.Name.Should().Be("parse-skill");
        skill.Description.Should().Be("Testing field parsing.");
        skill.Risk.Should().Be("safe");
        skill.Source.Should().Be("community");
        skill.DateAdded.Should().Be("2026-01-01");
        skill.Category.Should().Be("testing");
        skill.Author.Should().Be("test-author");
        skill.Tags.Should().BeEquivalentTo(["tag-a", "tag-b"]);
    }

    [Fact]
    public async Task ReadSkillAsync_ReturnsNullForMissingFile()
    {
        var emptyDir = Path.Combine(_tempDir, "empty");
        Directory.CreateDirectory(emptyDir);

        var result = await _scanner.ReadSkillAsync(emptyDir);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReadSkillAsync_ReturnsNullForMissingFrontmatter()
    {
        var dir = Path.Combine(_tempDir, "no-frontmatter");
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, "SKILL.md"), "# Just a heading\n\nNo frontmatter here.");

        var result = await _scanner.ReadSkillAsync(dir);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReadSkillAsync_BodyDoesNotContainFrontmatter()
    {
        CreateSkill("body-check", """
            ---
            name: body-check
            description: Test body extraction.
            risk: safe
            source: self
            ---

            ## When to Use
            - Body content starts here.
            """);

        var skill = await _scanner.ReadSkillAsync(Path.Combine(_tempDir, "body-check"));

        skill.Should().NotBeNull();
        skill!.RawBody.Should().NotContain("---");
        skill.RawBody.Should().Contain("When to Use");
    }

    [Fact]
    public async Task ScanAsync_ReturnsSkillsInAlphabeticalOrder()
    {
        CreateSkill("zebra-skill");
        CreateSkill("alpha-skill");
        CreateSkill("mango-skill");

        var found = new List<string>();
        await foreach (var path in _scanner.ScanAsync(_tempDir))
            found.Add(Path.GetFileName(path));

        found.Should().BeInAscendingOrder(StringComparer.OrdinalIgnoreCase);
    }
}
