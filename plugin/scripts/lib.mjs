// Shared by the plugin's hooks and skills: where mcpkeel is, where the plugin
// keeps its state, and what the user configured.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || resolve(here, "..");

/** The mcpkeel version this plugin is built and tested against. */
export const MCPKEEL_VERSION = JSON.parse(readFileSync(join(PLUGIN_ROOT, "package.json"), "utf8")).dependencies.mcpkeel;

/**
 * How to run mcpkeel, in order of preference:
 * 1. MCPKEEL_BIN, for this repository's tests.
 * 2. The copy Claude Code installed with the plugin, pinned by package-lock.json.
 * 3. The project's own pinned copy.
 * 4. npx at the exact version the plugin pins, never "latest".
 */
export function mcpkeelCommand(projectDir) {
  if (process.env.MCPKEEL_BIN) return [process.execPath, [process.env.MCPKEEL_BIN]];
  const bundled = join(PLUGIN_ROOT, "node_modules", "mcpkeel", "dist", "cli.js");
  if (existsSync(bundled)) return [process.execPath, [bundled]];
  const project = join(projectDir, "node_modules", "mcpkeel", "dist", "cli.js");
  if (existsSync(project)) return [process.execPath, [project]];
  return [process.platform === "win32" ? "npx.cmd" : "npx", ["--yes", `mcpkeel@${MCPKEEL_VERSION}`]];
}

export function runMcpkeel(projectDir, args, timeoutMs) {
  const [command, base] = mcpkeelCommand(projectDir);
  const child = spawnSync(command, [...base, ...args], {
    cwd: projectDir,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "", error: child.error };
}

/** The user's choices from the plugin's userConfig, with the defaults the manifest declares. */
export function options() {
  const pick = (key, allowed, fallback) => {
    // Claude Code passes the plugin's settings this way; in Codex, which has no
    // plugin settings, the same choice is an MCPKEEL_ variable.
    const value = process.env[`CLAUDE_PLUGIN_OPTION_${key}`] ?? process.env[`MCPKEEL_${key}`];
    return allowed.includes(value) ? value : fallback;
  };
  const seconds = Number(process.env.CLAUDE_PLUGIN_OPTION_TIMEOUT ?? process.env.MCPKEEL_TIMEOUT);
  // Codex parses "ask" but does not support it: it lets the call through. A
  // gate that cannot ask there must refuse instead.
  const ask = (value) => (value === "ask" && host() === "codex" ? "deny" : value);
  return {
    onDrift: ask(pick("ON_DRIFT", ["ask", "deny", "warn"], "ask")),
    onUnverified: ask(pick("ON_UNVERIFIED", ["allow", "ask", "deny"], "allow")),
    failOn: pick("FAIL_ON", ["critical", "high", "medium", "low"], "low"),
    timeoutSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 20,
  };
}

/**
 * The project root. Claude Code names it; Codex passes only the session's
 * working directory, so the nearest directory above it with an mcp.lock, or
 * else a .git, is taken as the root.
 */
export function projectDir(input) {
  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;
  const start = resolve(input?.cwd || process.cwd());
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, "mcp.lock")) || existsSync(join(dir, ".git"))) return dir;
    if (dirname(dir) === dir) return start;
  }
}

/** Codex sets PLUGIN_ROOT for plugin hooks; Claude Code does not. */
export function host() {
  return process.env.PLUGIN_ROOT ? "codex" : "claude-code";
}

/** One state file per project, so two projects open at once do not overwrite each other. */
export function statePath(project) {
  const base = process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), "mcpkeel-plugin");
  const key = createHash("sha256").update(resolve(project)).digest("hex").slice(0, 32);
  return join(base, "state", `${key}.json`);
}

export function readState(project) {
  try {
    return JSON.parse(readFileSync(statePath(project), "utf8"));
  } catch {
    return undefined;
  }
}

export function writeState(project, state) {
  const path = statePath(project);
  mkdirSync(dirname(path), { recursive: true });
  // Written whole, then renamed into place, so a tool call never reads half a file.
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(state, null, 2));
  renameSync(temporary, path);
}

export async function readStdin() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/**
 * A server name as it may appear in what Claude reads. Names come from the
 * project's config, but they are still kept to plain characters so nothing
 * shaped like an instruction can travel through one.
 */
export function plainName(name) {
  return String(name).replace(/[^A-Za-z0-9_.@/-]/g, "_").slice(0, 80);
}

export const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export function atLeast(severity, threshold) {
  return RANK[severity] <= RANK[threshold];
}
