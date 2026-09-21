# Ontoly MCP Usage

Use Ontoly MCP capabilities before searching files. Common capability groups:

- Architecture: `ExplainArchitecture`, `GraphStatistics`
- Lookup: `FindNode`, `FindFunction`, `InspectFile`, `InspectModule`, `InspectClass`, `InspectFunction`
- Dependencies: `FindDependencies`, `FindDependents`, `FindCycles`, `ImpactAnalysis`
- Requests: `TraceRequestLifecycle`, `FindResponsibleFunction`, `TraceExecution`
- Security: `FindAuthenticationFlow`, `FindConfigurationUsage`
- Configuration: `FindConfiguration`, `FindConfigurationUsage`
- Static analysis: `FindDeadCode`, `FindUnusedFeature`, `FindEntrypoints`
- Evidence packs: `EvidencePack`

If an agent cannot call MCP directly, use the nearest CLI command such as `ontoly evidence`, `ontoly report`, `ontoly query`, `ontoly trace`, or `ontoly inspect`.
