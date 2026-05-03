#!/usr/bin/env node
// @openagentlock/skills CLI — `npx @openagentlock/skills <subcommand>`.
//
// Subcommands:
//   list                          - list skills shipped in this package
//   add <skill> [<skill> ...]     - copy skill(s) into the harness skills dir
//   add --all                     - copy every shipped skill
//   path [--target <harness>]     - print the resolved target dir
//
// Resolution rules for --target:
//   claude (default) -> ~/.claude/skills
//   cursor           -> ~/.cursor/skills        (Cursor's per-user skills path)
//   codex            -> ~/.codex/skills         (Codex CLI's local skills path)
//   <abs path>       -> any explicit path the user passes
//
// The CLI copies the entire skill directory (SKILL.md + README.md +
// examples/) so every skill stays self-contained. We don't symlink —
// users on Windows / restrictive setups can't follow a symlink across
// volumes, and a copy keeps the layout stable across npm version bumps.

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const SKILLS_DIR = join(REPO_ROOT, "skills");

const TARGETS = {
  claude: join(homedir(), ".claude", "skills"),
  cursor: join(homedir(), ".cursor", "skills"),
  codex: join(homedir(), ".codex", "skills"),
};

function listShippedSkills() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((entry) => {
      const p = join(SKILLS_DIR, entry);
      return statSync(p).isDirectory() && existsSync(join(p, "SKILL.md"));
    })
    .sort();
}

function resolveTarget(arg) {
  if (!arg || arg === "claude") return TARGETS.claude;
  if (arg === "cursor") return TARGETS.cursor;
  if (arg === "codex") return TARGETS.codex;
  if (arg.startsWith("/") || arg.startsWith("~")) {
    return arg.replace(/^~/, homedir());
  }
  throw new Error(
    `unknown --target "${arg}". Pass one of: claude, cursor, codex, or an absolute path.`,
  );
}

function copyDirRecursive(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dst, entry);
    if (statSync(s).isDirectory()) copyDirRecursive(s, d);
    else copyFileSync(s, d);
  }
}

function parseArgs(argv) {
  // Tiny hand-rolled parser to avoid pulling in commander as a runtime
  // dep — npx-installed packages should be light. Subcommand is the
  // first positional; everything after is either a flag or a skill id.
  const [cmd, ...rest] = argv;
  const opts = { all: false, target: undefined, positional: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--all") opts.all = true;
    else if (a === "--target" || a === "-t") {
      opts.target = rest[++i];
    } else if (a === "--help" || a === "-h") {
      opts.help = true;
    } else opts.positional.push(a);
  }
  return { cmd, opts };
}

function usage() {
  process.stdout.write(
    `@openagentlock/skills — install OpenAgentLock agent skills.\n\n` +
      `Usage:\n` +
      `  npx @openagentlock/skills list\n` +
      `  npx @openagentlock/skills add <skill> [<skill> ...] [--target claude|cursor|codex|<path>]\n` +
      `  npx @openagentlock/skills add --all [--target ...]\n` +
      `  npx @openagentlock/skills path [--target ...]\n\n` +
      `Defaults to --target claude (${TARGETS.claude}).\n` +
      `See https://github.com/openagentlock/skills for the full skill catalog.\n`,
  );
}

function main(argv) {
  const { cmd, opts } = parseArgs(argv);
  if (!cmd || opts.help) return usage();

  if (cmd === "list") {
    const skills = listShippedSkills();
    if (skills.length === 0) {
      process.stdout.write("(no skills shipped in this build)\n");
      return;
    }
    for (const s of skills) process.stdout.write(s + "\n");
    return;
  }

  if (cmd === "path") {
    process.stdout.write(resolveTarget(opts.target) + "\n");
    return;
  }

  if (cmd === "add") {
    const target = resolveTarget(opts.target);
    const shipped = new Set(listShippedSkills());
    const requested = opts.all ? [...shipped] : opts.positional;
    if (requested.length === 0) {
      process.stderr.write(
        "no skills requested. Pass one or more skill ids, or --all.\n",
      );
      process.exit(2);
    }
    mkdirSync(target, { recursive: true });
    let installed = 0;
    for (const id of requested) {
      if (!shipped.has(id)) {
        process.stderr.write(`skipping "${id}": not in this build (try \`npx @openagentlock/skills list\`)\n`);
        continue;
      }
      copyDirRecursive(join(SKILLS_DIR, id), join(target, id));
      process.stdout.write(`installed ${id} → ${join(target, id)}\n`);
      installed++;
    }
    if (installed === 0) process.exit(1);
    return;
  }

  process.stderr.write(`unknown subcommand: ${cmd}\n\n`);
  usage();
  process.exit(2);
}

main(process.argv.slice(2));
