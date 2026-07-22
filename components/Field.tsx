"use client";

import { useId, type ReactNode } from "react";
import { HONEYPOT_FIELD } from "@/lib/form-shared";

type ControlProps = {
  id: string;
  name: string;
  className: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

type Props = {
  label: string;
  name: string;
  error?: string;
  className?: string;
  children: (props: ControlProps) => ReactNode;
};

/**
 * Label + control + inline error, wired together with `aria-describedby` so the
 * message is announced rather than only shown.
 */
export default function Field({ label, name, error, className = "", children }: Props) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={`block ${className}`}>
      <label
        htmlFor={id}
        className="label-mono mb-[7px] block"
      >
        {label}
      </label>

      {children({
        id,
        name,
        className: `ms-field${error ? " is-invalid" : ""}`,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}

      {error ? (
        <p id={errorId} className="mt-1.5 mb-0 font-mono text-[11px] text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Off-screen decoy field. Hidden with position rather than `display:none` so
 * naive bots still find and fill it; `tabIndex={-1}` keeps it out of tab order.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={HONEYPOT_FIELD}>Leave this empty</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}
