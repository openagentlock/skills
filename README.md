# OpenAgentLock Skills

Agent skills for [OpenAgentLock](https://github.com/openagentlock/OpenAgentLock). Each skill teaches an LLM-based assistant (Claude, Codex, Cursor, etc.) **how to generate the right `agentlock` command** for a security-relevant intent — most often: turning "I want to block this" into the YAML rule + the install command that lands it in the live policy.

The companion [openagentlock/rules](https://github.com/openagentlock/rules) repo is the **catalog** of pre-baked rules. This repo is the **toolkit** that lets an agent author new ones from natural-language intent and wire them up.

## Install (npx)

```bash
# list available skills
npx @openagentlock/skills list

# install one (defaults to ~/.claude/skills/<id>)
npx @openagentlock/skills add block-pattern

# install everything shipped with this version
npx @openagentlock/skills add --all

# pick a different harness or path
npx @openagentlock/skills add block-pattern --target cursor
npx @openagentlock/skills add block-pattern --target /opt/agents/skills
```

Targets resolved by `--target`:

| Value | Path |
|---|---|
| `claude` (default) | `~/.claude/skills` |
| `cursor` | `~/.cursor/skills` |
| `codex` | `~/.codex/skills` |
| absolute path | the path as given |

The CLI is bundled into the package — no runtime dependencies, just Node ≥ 18. The package ships every shipped skill alongside the CLI, so `npx @openagentlock/skills add` installs from the version pinned to the npm tag.

### Manual install (no npm)

If you'd rather not invoke npm, the skills are still plain Markdown files in this repo:

```bash
git clone https://github.com/openagentlock/skills.git ~/openagentlock-skills
mkdir -p ~/.claude/skills
ln -sf ~/openagentlock-skills/skills/block-pattern ~/.claude/skills/
```

Or fetch a single skill ad-hoc:

```bash
mkdir -p ~/.claude/skills/block-pattern
curl -L -o ~/.claude/skills/block-pattern/SKILL.md \
  https://raw.githubusercontent.com/openagentlock/skills/main/skills/block-pattern/SKILL.md
```

## Layout

```
skills/<skill-name>/
├── SKILL.md          # the prompt the agent loads (frontmatter + instructions)
├── README.md         # human-facing description
└── examples/         # input/output pairs that train the agent's expectations
```

A skill is a single self-contained directory. The `SKILL.md` file is what the agent reads — short instructions plus a YAML / JSON frontmatter that names the skill, describes when to use it, and lists the tools it relies on.

## Available skills

| Skill | What it does |
|---|---|
| [`block-pattern`](skills/block-pattern/) | Convert "block X" intent into a `rule.yaml` plus the `agentlock rules install` invocation that registers it. |

More on the way:

- `audit-deny` — given a recent ledger deny, suggest a tighter rule and PR it to a private rules registry.
- `propose-rule` — author a fresh community rule and open a PR against `openagentlock/rules`.
- `triage-flag` — when a daemon-side gate fires, classify whether the deny was correct and suggest a rule patch.

If a skill you'd like is missing, open an issue or send a PR.

## Using a skill

Once a skill is on disk, ask the agent in natural language: *"Block any bash command that pipes a file into `nc`."* The skill kicks in, drafts a `rule.yaml`, runs `agentlock rules install` against your daemon, and reports back.

## Trust model

These skills only **emit and execute the official `agentlock` CLI** — they don't reach into the daemon or write policy YAML directly. The CLI is the single entry point for installing a rule into the policy, so every skill's output is auditable in your shell history and in the OpenAgentLock ledger entry that records the install.

You should still review the generated `rule.yaml` before installing in production. The skill optimizes for first-draft quality, not for safe deploys.

## License

Apache-2.0. See [LICENSE](LICENSE).
