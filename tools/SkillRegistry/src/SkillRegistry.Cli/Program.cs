using Microsoft.Extensions.DependencyInjection;
using SkillRegistry.Core.Interfaces;
using SkillRegistry.Core.Models;
using SkillRegistry.Core.Services;

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry-point
//
// Usage:
//   skill-registry score  <skills-dir> [--output <file>] [--threshold <n>]
//   skill-registry scan   <skills-dir> [--strict]
//   skill-registry report <skills-dir> [--output <file>]
// ─────────────────────────────────────────────────────────────────────────────

if (args.Length == 0)
{
    PrintHelp();
    return 1;
}

var services = new ServiceCollection()
    .AddSingleton<ISkillScanner, SkillScanner>()
    .AddSingleton<ISkillValidator, SkillValidator>()
    .AddSingleton<ISecurityScanner, SecurityScanner>()
    .AddSingleton<ISkillScorer, SkillScorer>()
    .AddSingleton<IRegistryReporter, RegistryReporter>()
    .BuildServiceProvider();

var command  = args[0].ToLowerInvariant();
var skillsDir = args.Length > 1 ? args[1] : Path.Combine(Directory.GetCurrentDirectory(), "skills");
var output   = GetFlag(args, "--output", "data/registry-report.json");
var strict   = args.Contains("--strict");
var threshold = double.TryParse(GetFlag(args, "--threshold", null), out var t) ? t : (double?)null;

return command switch
{
    "score"  => await RunScoreAsync(services, skillsDir, output, threshold),
    "scan"   => await RunScanAsync(services, skillsDir, strict),
    "report" => await RunReportAsync(services, skillsDir, output),
    _        => PrintHelp(),
};

// ─────────────────────────────────────────────────────────────────────────────

static async Task<int> RunScoreAsync(
    IServiceProvider sp,
    string skillsDir,
    string output,
    double? threshold)
{
    var scanner   = sp.GetRequiredService<ISkillScanner>();
    var validator = sp.GetRequiredService<ISkillValidator>();
    var security  = sp.GetRequiredService<ISecurityScanner>();
    var scorer    = sp.GetRequiredService<ISkillScorer>();

    Console.WriteLine($"📐 Scoring: {skillsDir}");

    var scores = new List<SkillScore>();

    await foreach (var skillPath in scanner.ScanAsync(skillsDir))
    {
        var metadata = await scanner.ReadSkillAsync(skillPath);
        if (metadata is null) continue;

        var metaResult = validator.ValidateMetadata(metadata);
        var docResult  = validator.ValidateDocumentation(metadata);
        var secFlags   = security.Scan(metadata);
        var score      = scorer.Score(metadata, metaResult, docResult, secFlags);

        scores.Add(score);
    }

    // Table output
    var display = threshold.HasValue
        ? scores.Where(s => s.Scores.Total < threshold.Value).ToList()
        : scores;

    Console.WriteLine($"\n{"Skill",-50} {"Total",6} {"Meta",6} {"Docs",6} {"Sec",6}  Label");
    Console.WriteLine(new string('─', 85));

    foreach (var s in display.OrderBy(s => s.Scores.Total))
    {
        var icon = s.Label switch
        {
            "excellent"        => "✅",
            "good"             => "🟢",
            "needs_improvement"=> "⚠️ ",
            _                  => "❌",
        };
        Console.WriteLine(
            $"{s.SkillId,-50} {s.Scores.Total,6:F1} {s.Scores.Metadata,6:F1} {s.Scores.Documentation,6:F1} {s.Scores.Security,6:F1}  {icon} {s.Label}");
    }

    var avg = scores.Count > 0 ? scores.Average(s => s.Scores.Total) : 0;
    Console.WriteLine($"\n📊 {scores.Count} skills scored. Average: {avg:F1}");

    return 0;
}

static async Task<int> RunScanAsync(IServiceProvider sp, string skillsDir, bool strict)
{
    var scanner  = sp.GetRequiredService<ISkillScanner>();
    var security = sp.GetRequiredService<ISecurityScanner>();

    Console.WriteLine($"🔐 Scanning: {skillsDir}");

    int errors = 0, warnings = 0;

    await foreach (var skillPath in scanner.ScanAsync(skillsDir))
    {
        var metadata = await scanner.ReadSkillAsync(skillPath);
        if (metadata is null) continue;

        var flags = security.Scan(metadata);
        if (flags.Count == 0) continue;

        Console.WriteLine($"\n⚠️  {metadata.Id}");
        foreach (var flag in flags)
        {
            var icon = flag.Severity == "error" ? "❌" : "⚠️ ";
            Console.WriteLine($"   {icon} [{flag.Code}] line {flag.Line}: {flag.Message}");
            Console.WriteLine($"      matched: {flag.MatchedText}");

            if (flag.Severity == "error")   errors++;
            if (flag.Severity == "warning") warnings++;
        }
    }

    Console.WriteLine($"\n🔐 Scan complete — {errors} errors, {warnings} warnings.");

    if (errors > 0) return 1;
    if (strict && warnings > 0) return 1;
    return 0;
}

static async Task<int> RunReportAsync(IServiceProvider sp, string skillsDir, string output)
{
    var scanner   = sp.GetRequiredService<ISkillScanner>();
    var validator = sp.GetRequiredService<ISkillValidator>();
    var security  = sp.GetRequiredService<ISecurityScanner>();
    var scorer    = sp.GetRequiredService<ISkillScorer>();
    var reporter  = sp.GetRequiredService<IRegistryReporter>();

    Console.WriteLine($"📋 Generating registry report for: {skillsDir}");

    var scores = new List<SkillScore>();

    await foreach (var skillPath in scanner.ScanAsync(skillsDir))
    {
        var metadata = await scanner.ReadSkillAsync(skillPath);
        if (metadata is null) continue;

        var metaResult = validator.ValidateMetadata(metadata);
        var docResult  = validator.ValidateDocumentation(metadata);
        var secFlags   = security.Scan(metadata);
        var score      = scorer.Score(metadata, metaResult, docResult, secFlags);
        scores.Add(score);
    }

    var report = await reporter.GenerateAsync(scores, "unknown");
    await reporter.WriteAsync(report, output);

    Console.WriteLine($"💾 Report saved → {output}");
    Console.WriteLine($"   Skills: {report.Summary.TotalSkills}");
    Console.WriteLine($"   Average score: {report.Summary.AverageScore:F1}");

    return 0;
}

static string? GetFlag(string[] args, string flag, string? defaultValue)
{
    var idx = Array.IndexOf(args, flag);
    return idx >= 0 && idx + 1 < args.Length ? args[idx + 1] : defaultValue;
}

static int PrintHelp()
{
    Console.WriteLine("""
        Antigravity Skill Registry CLI

        Usage:
          skill-registry score  <skills-dir> [--output <file>] [--threshold <n>]
          skill-registry scan   <skills-dir> [--strict]
          skill-registry report <skills-dir> [--output <file>]

        Commands:
          score   Compute quality scores for all skills.
          scan    Scan skills for security pattern violations.
          report  Generate a full JSON registry health report.

        Options:
          --output <file>   Output file path (default: data/registry-report.json)
          --threshold <n>   Only display skills below this score (score command)
          --strict          Treat warnings as errors (scan command)
        """);
    return 1;
}
