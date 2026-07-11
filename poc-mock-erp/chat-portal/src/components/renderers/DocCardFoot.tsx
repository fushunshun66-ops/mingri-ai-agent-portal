import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function DocCardFoot({
  actions,
  hint,
}: {
  actions: ReactNode;
  hint?: string;
}) {
  return (
    <div className="doc-card-foot">
      <div className="doc-card-foot-main">{actions}</div>
      {hint && <span className="doc-card-foot-hint">{hint}</span>}
    </div>
  );
}

export function DocActionButton({
  label,
  filled,
  primary = false,
  disabled,
  onClick,
}: {
  label: string;
  filled?: boolean;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      className={`doc-btn${primary ? " doc-btn-primary" : ""}${filled ? " doc-btn-filled" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {filled && <span className="doc-btn-check" aria-hidden>✓</span>}
      <span>{label}</span>
    </Button>
  );
}
