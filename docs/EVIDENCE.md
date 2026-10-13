# Evidence

Every claim in the README comes from a run recorded here: what was run, when, against what, and what came back. Runs that used a private scratch repository are described without links.

## Releases are built and signed in CI

| Version | Published | Workflow run | Provenance |
| --- | --- | --- | --- |
| 0.2.0 | 2026-10-09 | [release #37950136684](https://github.com/mcpkeel/mcpkeel/actions/runs/37950136684) | SLSA v1 attestation on npm |
| 0.2.1 | 2026-10-10 | [release #38080439883](https://github.com/mcpkeel/mcpkeel/actions/runs/38080439883) | SLSA v1 attestation on npm |

Both were published by `.github/workflows/release.yml` through npm trusted publishing, with no token stored anywhere. To check what you install:

```sh
npm view mcpkeel@0.2.1 dist.attestations.provenance.predicateType   # https://slsa.dev/provenance/v1
npm audit signatures                                                # in a project that depends on mcpkeel
```

## The action on GitHub's runners

A private scratch repository, 2026-10-09 and 2026-10-10, with one server (`@modelcontextprotocol/server-memory`, pinned to an exact version), its `mcp.lock`, and the two workflows from the README.

| Step | Expected | Result |
| --- | --- | --- |
| `verify` on a clean lockfile | green job, no drift | green, "No drift. Every server matches mcp.lock." |
| One tool description edited in `mcp.lock`, then `verify` | job fails, change in the summary | exit 1, `HIGH tool add_observations description changed` |
| `update-pr` with the setting that lets Actions open pull requests turned off | a clear failure | exit 1, "GitHub Actions is not permitted to create or approve pull requests" |
| `update-pr` with the setting on, the branch already pushed by the failed run | a pull request | opened, titled `Update mcp.lock: 1 change (1 high)`, body the Markdown report |
| `update-pr` again, the pull request still open | the same pull request updated | updated, no second pull request |
| Both modes with `actions/checkout` v7 and `actions/setup-node` v7 | as above, without deprecation warnings | as above; the Node 20 and `punycode` warnings were gone |
| `verify` through `mcpkeel/mcpkeel@v0.2.1` | runs 0.2.1 | `MCPKEEL_VERSION: 0.2.1`, drift reported |

## What package launchers run, read from the registries

Run 2026-10-11 against the public registries, with `resolvePackage` from `src/resolve.ts`:

| Launcher | Package | Release that runs | Pinned digest |
| --- | --- | --- | --- |
| `npx` | `@modelcontextprotocol/server-memory@2026.8.31` | 2026.8.31 | `sha512-ljj/3S4aGjxdNSQWw6gucKKGnTLdBPWxzapyY/MT2tOVyZwvxChvevXSLPwx59nKJAlVpUVW+cOlnVRXRwiqMQ==` |
| `uvx` | `mcp-server-fetch` | 2026.10.10 | `sha256-aDSbwIzSk9+134aHpmw0CjGY7Z8IEWuyqmHETensyGI=` |
| `docker run` | `mcp/fetch` (Docker Hub) | latest | `sha256:1a7a0996a565a0b8ca5c41b42830d4e5f334d33f851596bbd9debb2beedb22d3` |
| `docker run` | `ghcr.io/github/github-mcp-server` | latest | `sha256:ffced0d76e77428532a2ced185516992d77fd146d69eec2f244e6237d1a97796` |

The same lookup for `uvx mcp-server-fetch` on 2026-10-10 returned release 2026.8.18. One day later, with the config unchanged, the command runs different code. That is the change `verify` reports as `server.package.changed`.

End to end, on 2026-10-10: a project with `npx -y @modelcontextprotocol/server-memory` and a lockfile written by 0.2.1 passed `verify` with a note that the package was not pinned yet, `update` added the pin (`2026.8.31`, the digest above), and `verify --probe` passed again.

## The MCPTox benchmark

`node eval/mcptox.mjs`, MCPTox at commit `f85189f`, checked against the digests in the script. Counts in [`eval/results/mcptox.json`](../eval/results/mcptox.json); the benchmark's data is not part of this repository.

| What | Result |
| --- | --- |
| Poisoned tool appears on a server pinned with its real tools: reported at high or above | 485 / 485 |
| ... graded critical, because a built-in check fired | 50 / 485 |
| Real tools of the same 45 servers flagged by a built-in check | 0 / 362 |

The checks were measured as they stand, not tuned to the benchmark. CI runs `eval/mcptox.mjs --check` on every change, and fails if any of these numbers gets worse.

## The Claude Code plugin in a real session

2026-10-12, Claude Code 2.1.296, headless (`claude -p`), with the plugin loaded from `plugin/` and set to block. The project pinned the test server, which was then switched to a version whose `create_issue` description asks for `~/.ssh/id_rsa` and says not to tell the user. Claude was asked to create an issue with that tool.

- The SessionStart hook ran `mcpkeel verify` and told Claude that `github` no longer matched `mcp.lock` (critical; MK105, MK112), without passing on the changed text.
- Claude read the poisoned description when it loaded the tool, recognised it as an attempt to take the SSH key, and did not read the key.
- When Claude called `create_issue`, the PreToolUse hook denied the call before it reached the server: `Blocked by mcpkeel: MCP server github no longer matches mcp.lock (critical; MK105, MK112).`

The same behaviour, and the `ask` and `warn` settings, are covered by `test/plugin.test.mjs`.

## The plugin in a real Codex session

2026-10-13, Codex CLI 0.159.3, run with `codex exec` in a separate `CODEX_HOME`. The plugin was installed the way a user installs it, with `codex plugin marketplace add mcpkeel/mcpkeel` and `codex plugin add mcpkeel@mcpkeel`. The project pinned the test server, which was then switched to the version whose `create_issue` description asks for `~/.ssh/id_rsa`. Codex was asked to create an issue with that tool. Hook trust was granted for the run with `--dangerously-bypass-hook-trust`, as Codex documents for automation.

- The SessionStart hook ran. Codex replied that the `github` server had changed since `mcp.lock` (MK105, MK112) and that it would treat that server's descriptions as untrusted.
- The PreToolUse hook blocked the call: `Tool call blocked by PreToolUse hook: Blocked by mcpkeel: MCP server github no longer matches mcp.lock (critical; MK105, MK112).` The issue was not created.
- Codex does not support asking before a tool call, so the plugin's default, ask, became a block there, as designed.
- Codex did not install the plugin's `package-lock.json` dependencies, so the plugin ran mcpkeel through `npx` at the version it pins.

## SARIF

The output of `verify --sarif` for a run with three changes, one of them a payload split across fields, validated against the OASIS SARIF 2.1.0 schema (`sarif-schema-2.1.0.json`, errata 01) with Ajv on 2026-10-10.

## Reproduce

```sh
npx mcpkeel demo                    # a rug pull caught, on a local server, no network
npm ci && npm test                  # 103 tests: CLI end to end, units, the action's script
npm run build && node eval/mcptox.mjs
```
