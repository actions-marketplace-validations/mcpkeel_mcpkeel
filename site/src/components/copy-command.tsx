"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "failed";

const LABEL: Record<State, string> = { idle: "Copy", copied: "Copied", failed: "Select and copy" };

/** A command with a button that copies it. The result is announced to screen readers. */
export function CopyCommand({ command }: { command: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className="install">
      <code>{command}</code>
      <button type="button" className="copy" onClick={copy} aria-label={`Copy ${command}`}>
        {LABEL[state]}
      </button>
      <span className="copy-status" role="status" aria-live="polite">
        {state === "copied" ? "Copied to the clipboard" : state === "failed" ? "Could not copy; select the command instead" : ""}
      </span>
    </div>
  );
}
