"use client";

import { useState } from "react";
import Markdown from "./Markdown";

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 4,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const isEmpty = !value.trim();

  return (
    <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2 py-1.5">
        <div className="flex gap-1">
          <TabBtn active={tab === "write"} onClick={() => setTab("write")}>
            Write
          </TabBtn>
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")}>
            Preview
          </TabBtn>
        </div>
        <span className="pr-1 text-[10px] uppercase tracking-wide text-dim">Markdown</span>
      </div>
      {tab === "write" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Supports **markdown**, `code`, lists, - [ ] tasks, [links](https://)"}
          rows={rows}
          className="block w-full resize-y bg-transparent px-3 py-2 text-sm text-default placeholder:text-dim outline-none"
        />
      ) : (
        <div className="min-h-[6rem] px-3 py-2">
          {isEmpty ? (
            <p className="text-sm text-dim">Nothing to preview.</p>
          ) : (
            <Markdown>{value}</Markdown>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
        (active
          ? "bg-[hsl(var(--primary-soft))] text-brand"
          : "text-muted hover:bg-[hsl(var(--surface-2))] hover:text-default")
      }
    >
      {children}
    </button>
  );
}
