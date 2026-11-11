// The MCPTox benchmark's data, downloaded at a pinned commit, checked against
// a known digest, and read the way mcpkeel pins a server. Shared by
// eval/mcptox.mjs and eval/explain.mjs.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cache = join(dirname(fileURLToPath(import.meta.url)), "..", ".cache", "mcptox");
export const REPOSITORY = "zhiqiangwang4/MCPTox-Benchmark";
export const COMMIT = "f85189f9ad12504c197c7f920ab818a40657b1fa";
export const FILES = {
  "pure_tool.json": "54b1eb0e9d7b2f18465266aa9d9dfda828cd558b1269b74731ec2c5d8579e617",
  "response_all.json": "79a90049be931c59e71446d6180b1d7f0d196d123d08a59bc155d142b5041c03",
};

async function fetchPinned(name, digest) {
  const path = join(cache, name);
  if (!existsSync(path)) {
    mkdirSync(cache, { recursive: true });
    const url = `https://raw.githubusercontent.com/${REPOSITORY}/${COMMIT}/${name}`;
    const response = await fetch(url, { redirect: "error" });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = readFileSync(path);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== digest) throw new Error(`${name}: expected sha256 ${digest}, got ${actual}. Delete ${path} to download it again.`);
  return JSON.parse(bytes.toString("utf8"));
}

/** A tool as mcpkeel pins it: a description and a schema with each argument's description. */
export function toolEntry(description, args = []) {
  const properties = Object.fromEntries(args.map(({ name, description: text }) => [name, text ? { type: "string", description: text } : { type: "string" }]));
  return { integrity: "", description, inputSchema: { type: "object", properties } };
}

/** The benchmark gives each server's real tools as the system prompt an agent saw: "Tool: …", "Description: …", "Arguments: - name: …". */
function parseCleanTools(prompt) {
  const tools = [];
  for (const block of prompt.split(/\n(?=Tool: )/).slice(1)) {
    const name = /^Tool: (.+)$/m.exec(block)?.[1]?.trim();
    const description = /^Description: ([\s\S]*?)(?:\nArguments:|$)/m.exec(block)?.[1]?.trim() ?? "";
    const args = [...block.matchAll(/^- ([^:\n]+): (.*?)(?: \((?:required|optional)\))?$/gm)].map((m) => ({
      name: m[1].trim(),
      description: m[2].trim() === "No description" ? "" : m[2].trim(),
    }));
    if (name) tools.push({ name, entry: toolEntry(description, args) });
  }
  return tools;
}

export const lockOf = (tools) => ({ lockfileVersion: 1, servers: { s: { transport: "stdio", source: {}, integrity: "", tools } } });

/**
 * The benchmark as mcpkeel meets it: each poisoned tool with the server and
 * name it belongs to, and each server's real tools.
 */
export async function loadMcptox() {
  const poisoned = await fetchPinned("pure_tool.json", FILES["pure_tool.json"]);
  const responses = await fetchPinned("response_all.json", FILES["response_all.json"]);
  const cleanTools = new Map(Object.values(responses.servers).map((server) => [server.server_name, parseCleanTools(server.clean_system_promot)]));
  const attacks = poisoned.flatMap((server) =>
    Object.values(server).map((tool) => ({
      server: tool.server_name,
      tool: tool.tool_name,
      paradigm: tool.paradigm,
      risk: tool["security risk"],
      entry: toolEntry(tool.tool_content.trim()),
    })),
  );
  return { attacks, cleanTools };
}
