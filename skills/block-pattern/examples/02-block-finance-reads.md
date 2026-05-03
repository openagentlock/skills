# Example: scope-limit a directory tree

## Operator intent

> "Stop the agent from reading anything in `~/Documents/Finance/`."

## Expected rule

```yaml
schema_version: 1
id: scope.no-finance-reads
name: Block Read tool calls under ~/Documents/Finance
description: |
  Denies any Read tool call whose path resolves into the operator's
  finance directory tree. Used as a scope-limit fence rather than a
  threat-shape match — the agent has no work to do in that subtree
  and any read is, by policy, an unwanted side effect.
severity: high
tags: [scope, filesystem, read]
authors:
  - github: openagentlock
license: Apache-2.0
compatible_agentlock: ">=0.1.0"
gate:
  match:
    tool: Read
    any_path_regex:
      - '^/(Users|home)/[^/]+/Documents/Finance(/|$)'
  evaluate:
    - kind: always
      action: deny
```

## Notes for the agent

- Root the regex with `^/(Users|home)/[^/]+/...` so the path matches both macOS and Linux conventions.
- Don't rely on `~` — the daemon sees the absolute path the harness sends, which has already been tilde-expanded.
- A trailing `(/|$)` anchor avoids matching `Finance.bak` or `Financial`.
