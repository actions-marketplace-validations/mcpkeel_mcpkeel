import type { ReactNode } from "react";

// Terminal output, set as text so it can be read, copied and searched.

export function Printout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="printout" role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function Change({ severity, children }: { severity: "critical" | "low"; children: ReactNode }) {
  return (
    <div className="change">
      <span className={`sev sev-${severity}`}>{severity.toUpperCase()}</span>
      <div>{children}</div>
    </div>
  );
}

export function ServerLine({ name, changes }: { name: string; changes: number }) {
  return (
    <p className="server">
      <span className="bad">✗</span> <b>{name}</b> <span className="quiet">{changes === 1 ? "1 change" : `${changes} changes`}</span>
    </p>
  );
}
