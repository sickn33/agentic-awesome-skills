# Discovery locations

`detect_skills.py` defaults to the current working directory, not a particular Windows user account. Use `--path ./incoming` to narrow discovery. It searches to five levels, skips common caches and symlink directories, and reports candidate metadata without executing or installing skills.

`--all` explicitly adds the home directory, Projects/dev/repos/workspace/code and legacy Windows `C:\temp`/`C:\projects` locations if present. Request this broad read scope only when relevant to the user's task. Candidate output can reveal paths and timestamps; keep it local unless sharing is authorized.

Installed names are discovered under the workspace's `./skills`. Duplicate names are hints, not evidence of equal content. Discovery validates required frontmatter fields and rejects malformed YAML; it does not establish trust, provenance, dependency compatibility or secret-free contents. A candidate needs individual review before installation.
