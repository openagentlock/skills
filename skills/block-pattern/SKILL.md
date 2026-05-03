---
name: block-pattern
description: Use when the operator wants to block a specific tool-call pattern (a bash regex, a sensitive file read, an MCP misuse) and needs an OpenAgentLock policy gate authored and installed. Triggers on phrases like "block X", "deny when …", "stop the agent from running …", "make a rule for …", "gate this", or any direct ask to add a new rule to the local OpenAgentLock policy.
required_tools: [Bash, Write, Read]
---

# block-pattern

You translate operator intent into an [OpenAgentLock](https://github.com/openagentlock/OpenAgentLock) policy gate, install it, and report what changed.

## Pre-flight

Before drafting anything, confirm prerequisites:

```bash
# OpenAgentLock CLI present?
agentlock --version

# Daemon reachable?
agentlock status --json
```

If either fails, stop and tell the operator the daemon needs to be running on `127.0.0.1:7878`. Do not proceed.

## Author the rule

A gate is a single match block plus an evaluator list. Use this template — fill the values, leave the structure:

```yaml
schema_version: 1
id: <namespace>.<kebab-case-name>
name: <one-line human title>
description: |
  <2–4 sentence explanation of the threat shape and why the regex
  catches it>
severity: <info | low | medium | high | critical>
tags: [<comma-separated lowercase tags>]
authors:
  - github: <operator-or-org>
license: Apache-2.0
compatible_agentlock: ">=0.1.0"
gate:
  match:
    tool: <Bash | Read | Write | Edit | mcp__*>
    any_command_regex:    # only for Bash
      - '<RE2-compatible regex>'
    any_path_regex:       # only for Read/Write/Edit
      - '<RE2 regex>'
  evaluate:
    - kind: always
      action: <allow | deny | monitor | warn>
```

Critical constraints:

- **The daemon uses Go RE2.** Negative lookahead (`(?!…)`), backreferences (`\1`), and possessive quantifiers are unsupported. If the operator asks to "block everything except X", invert the matcher: write a positive regex for the dangerous shape rather than a negative regex around the safe one.
- **`id` must be globally unique across the operator's installed registries.** Use a `<namespace>.<rule>` shape — `rogue.*` for adversarial-agent shapes, `exfil.*` for data-leaving-host, `supply-chain.*` for dependency installs, or a custom company namespace for internal rules.
- **`severity` flows into ledger entries.** Use `critical` only for shapes that would constitute an incident if the agent succeeded (secret reads, data exfil, destructive admin); reserve `high` for shapes that need human-in-the-loop; `medium` and below are the soft tier.

## Test the regex (locally) before installing

```bash
# Save the rule to a tempfile and ask the operator to confirm before installing
cat > /tmp/agentlock-draft-rule.yaml <<'YAML'
<rule body>
YAML
```

Show the operator the draft. Ask: *"Install this rule? (yes/no)"*. Do not proceed without confirmation.

## Install

The rule lives in the operator's local policy. Install via the daemon's existing `/v1/policy/gates/yaml` endpoint, which the CLI wraps:

```bash
# Option A: rule lives in a tap (commit it to a private rules registry first)
agentlock rules install <namespace>.<rule>

# Option B: ad-hoc, no tap. Use a private one-shot tap:
mkdir -p /tmp/oal-rules-adhoc/rules/<rule-leaf>
mv /tmp/agentlock-draft-rule.yaml /tmp/oal-rules-adhoc/rules/<rule-leaf>/rule.yaml
( cd /tmp/oal-rules-adhoc && git init -q && git add -A && git commit -q -m draft )
agentlock rules add /tmp/oal-rules-adhoc --name oal-rules-adhoc
agentlock rules install oal-rules-adhoc:<namespace>.<rule>
```

After install, verify:

```bash
agentlock fake-hook --session "$(cat ~/Library/Application\ Support/OpenAgentLock/last-session.id)" \
  --tool Bash --command '<an example payload that should match>'
# expect: verdict=deny, rule_id=<your rule id>
```

## Report back

Tell the operator:

- The exact rule id you installed.
- The new policy hash from the install response.
- The fake-hook verdict on the example payload.
- Whether they should also open a PR upstreaming the rule to <https://github.com/openagentlock/rules>.

If anything failed (regex didn't compile, daemon refused), surface the exact error message — do not retry blindly.

## Don't

- Don't silently bypass an existing gate. If the operator's intent looks like "make X allowed" rather than "block X", stop and surface that — gate edits go through `agentlock rules uninstall <id>` + a fresh install, not through editing the daemon's policy file.
- Don't write to `~/Library/Application Support/OpenAgentLock/...` or `~/.config/openagentlock/...` directly. The CLI is the only sanctioned write path.
- Don't generate a rule that depends on negative lookahead, backreferences, or any feature outside RE2.
- Don't claim a rule is installed without verifying via `agentlock fake-hook` or `curl 127.0.0.1:7878/v1/policy/view`.
