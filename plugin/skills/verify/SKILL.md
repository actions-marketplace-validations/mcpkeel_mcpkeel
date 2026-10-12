---
description: Check this project's MCP servers against mcp.lock now and refresh which ones the mcpkeel gate holds back. Use when the user asks whether their MCP servers changed, after they accept changes with mcpkeel update, or when a tool call was held back by mcpkeel.
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/verify.mjs)
---

Run this and wait for it to finish. It starts each MCP server in the project's config, so it can take a few seconds:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/verify.mjs
```

Report the result to the user in a few lines: which servers changed, which could not be checked, and which match. If any changed, offer `/mcpkeel:review` to see the changes. Do not run `mcpkeel update` on your own.
