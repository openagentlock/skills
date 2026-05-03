# `block-pattern`

Turn natural-language "block X" intent into an OpenAgentLock policy gate, install it, and confirm the deny fires.

## When the agent triggers

The skill activates on operator messages that look like:

- "Block any bash command that pipes a file into `nc`."
- "Stop the agent from reading anything in `~/Documents/Finance/`."
- "Deny `mcp__*` calls to the slack tool when posting to a non-allowlisted channel."
- "Make a rule for the new `jq -e` exploit."

It does **not** activate for "make X allowed" or for editing existing gates — those have a different surface (`agentlock rules uninstall <id>` + re-install, not a freeform edit).

## What the agent emits

A first-draft `rule.yaml` matching the operator's intent, presented for confirmation, then installed via `agentlock rules install`. The rule is RE2-safe by construction (the SKILL.md explicitly tells the agent to avoid lookaround / backreferences) so the daemon won't refuse it at install time.

## Examples

See [`examples/`](examples/) for fixtures that pair operator-intent prompts with the rule the skill should produce. Use those when extending the skill.
