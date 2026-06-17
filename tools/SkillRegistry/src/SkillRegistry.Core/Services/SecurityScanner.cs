using System.Text.RegularExpressions;
using SkillRegistry.Core.Interfaces;
using SkillRegistry.Core.Models;

namespace SkillRegistry.Core.Services;

public sealed class SecurityScanner : ISecurityScanner
{
    private static readonly string[] AllowlistMarkers =
        ["# security-allowlist", "<!-- security-allowlist -->"];

    private static readonly IReadOnlyList<SecurityPattern> DefaultPatterns =
    [
        new() { Code = "SEC001", Severity = "error",   Regex = @"rm\s+-[rf]{1,2}\s+/(?!\S)",                         Description = "Destructive rm targeting root filesystem",           Rationale = "rm -rf / deletes the entire filesystem." },
        new() { Code = "SEC002", Severity = "error",   Regex = @"curl\b[^\n]*\|\s*bash",                              Description = "Remote code execution: curl | bash",                 Rationale = "Pipes untrusted remote content into a shell." },
        new() { Code = "SEC003", Severity = "error",   Regex = @"wget\b[^\n]*\|\s*(?:sh|bash|zsh)",                   Description = "Remote code execution: wget | sh",                   Rationale = "Downloads and executes without integrity check." },
        new() { Code = "SEC004", Severity = "error",   Regex = @"\bInvoke-Expression\b",                              Description = "PowerShell RCE: Invoke-Expression",                  Rationale = "Evaluates arbitrary strings as PowerShell code." },
        new() { Code = "SEC005", Severity = "warning", Regex = @"\biex\b",                                            Description = "PowerShell alias: iex (Invoke-Expression)",          Rationale = "Alias for Invoke-Expression; context-dependent." },
        new() { Code = "SEC006", Severity = "warning", Regex = @"chmod\s+[0-9]*7[0-9]*[0-9]*\s",                     Description = "World-writable permission (chmod 7xx)",               Rationale = "chmod 777 grants all users write+execute access." },
        new() { Code = "SEC007", Severity = "warning", Regex = @"\beval\s*\(",                                        Description = "Dynamic eval() detected",                            Rationale = "eval() can execute arbitrary code." },
        new() { Code = "SEC008", Severity = "warning", Regex = @"base64\s+-d\b[^\n]*\|",                              Description = "Possible obfuscation via base64 decode + pipe",      Rationale = "Commonly used to hide malicious payloads." },
        new() { Code = "SEC009", Severity = "error",   Regex = @"(password|passwd|secret|api[_-]?key)\s*=\s*['""][^'""]{4,}['""]", Description = "Hardcoded credential detected", Rationale = "Credentials in source get committed and exposed." },
        new() { Code = "SEC010", Severity = "warning", Regex = @"sudo\s+rm\s+-[rf]{1,2}",                             Description = "Privileged destructive deletion: sudo rm -rf",       Rationale = "Privileged deletion amplifies blast radius." },
        new() { Code = "SEC011", Severity = "error",   Regex = @":\s*\(\)\s*\{\s*:|fork\s+bomb",                      Description = "Fork bomb or infinite process spawner",              Rationale = "Fork bombs consume all system resources." },
        new() { Code = "SEC012", Severity = "error",   Regex = @"dd\s+if=/dev/(?:zero|random|urandom)\s+of=/dev/[sh]d[a-z]", Description = "Disk overwrite via dd",                 Rationale = "Overwrites raw disk, causing permanent data loss." },
    ];

    public IReadOnlyList<SecurityFlag> Scan(SkillMetadata skill)
    {
        var isOffensive = string.Equals(skill.Risk, "offensive", StringComparison.OrdinalIgnoreCase);
        var flags = new List<SecurityFlag>();
        var lines = skill.RawBody.Split('\n');

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            if (IsAllowlisted(line))
                continue;

            foreach (var pattern in DefaultPatterns)
            {
                var match = Regex.Match(line, pattern.Regex, RegexOptions.IgnoreCase);
                if (!match.Success)
                    continue;

                var severity = isOffensive && pattern.Severity == "error"
                    ? "warning"
                    : pattern.Severity;

                flags.Add(new SecurityFlag
                {
                    Code = pattern.Code,
                    Severity = severity,
                    Message = pattern.Description,
                    Line = i + 1,
                    MatchedText = match.Value.Trim(),
                    PatternRegex = pattern.Regex,
                });
            }
        }

        return flags;
    }

    public IReadOnlyList<SecurityPattern> GetPatterns() => DefaultPatterns;

    private static bool IsAllowlisted(string line) =>
        AllowlistMarkers.Any(m => line.Contains(m, StringComparison.OrdinalIgnoreCase));
}
