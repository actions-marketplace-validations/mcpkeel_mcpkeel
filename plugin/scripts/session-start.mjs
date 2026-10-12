// SessionStart hook: check the project's MCP servers against mcp.lock before
// the agent reads them, tell the user what changed, and record the result for
// the PreToolUse gate. A session start cannot be blocked; the gate is where
// a call is stopped.
import { contextForModel, messageForUser, runCheck } from "./check.mjs";
import { projectDir, readStdin } from "./lib.mjs";

const input = await readStdin();
const state = runCheck(projectDir(input), input.session_id);
const context = contextForModel(state);
const message = messageForUser(state);

if (context || message) {
  const output = { hookSpecificOutput: { hookEventName: "SessionStart", ...(context ? { additionalContext: context } : {}) } };
  if (message) output.systemMessage = message;
  process.stdout.write(JSON.stringify(output));
}
