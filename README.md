# OpenAgentLock Skills

Agent skills for [OpenAgentLock](https://github.com/openagentlock/OpenAgentLock). Each skill teaches an LLM-based assistant (Claude, Codex, Cursor, etc.) **how to generate the right `agentlock` command** for a security-relevant intent — most often: turning "I want to block this" into the YAML rule + the install command that lands it in the live policy.

The companion [openagentlock/rules](https://github.com/openagentlock/rules) repo is the **catalog** of pre-baked rules. This repo is the **toolkit** that lets an agent author new ones from natural-language intent and wire them up.

## Layout

```
skills/<skill-name>/
├── SKILL.md          # the prompt the agent loads (frontmatter + instructions)
├── README.md         # human-facing description
└── examples/         # input/output pairs that train the agent's expectations
```

A skill is a single self-contained directory. The `SKILL.md` file is what the agent reads — short instructions plus a YAML/JSON frontmatter that names the skill, describes when to use it, and lists the tools it relies on.

## Available skills

| Skill | What it does |
|---|---|
| [`block-pattern`](skills/block-pattern/) | Convert "block X" intent into a `rule.yaml` plus the `agentlock rules install` invocation that registers it. |

More on the way:

- `audit-deny` — given a recent ledger deny, suggest a tighter rule and PR it to a private rules registry.
- `propose-rule` — author a fresh community rule and open a PR against `openagentlock/rules`.
- `triage-flag` — when a daemon-side gate fires, classify whether the deny was correct and suggest a rule patch.

If a skill you'd like is missing, open an issue or send a PR.

## Using a skill (Claude Code)

Drop the skill directory into the agent's skills path:

```bash
mkdir -p ~/.claude/skills
cp -r skills/block-pattern ~/.claude/skills/
```

Then ask the agent in natural language: *"Block any bash command that pipes a file into `nc`."* The skill kicks in, drafts a `rule.yaml`, runs `agentlock rules install` against your daemon, and reports back.

## Trust model

These skills only **emit and execute the official `agentlock` CLI** — they don't reach into the daemon or write policy YAML directly. The CLI is the single entry point for installing a rule into the policy, so every skill's output is auditable in your shell history and in the OpenAgentLock ledger entry that records the install.

You should still review the generated `rule.yaml` before installing in production. The skill optimizes for first-draft quality, not for safe deploys.

## License

Apache-2.0. See [LICENSE](LICENSE).
