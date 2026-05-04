const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  TODO: { label: "To do", cls: "badge-slate" },
  IN_PROGRESS: { label: "In progress", cls: "badge-amber" },
  IN_REVIEW: { label: "In review", cls: "badge-purple" },
  DONE: { label: "Done", cls: "badge-green" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: "badge-slate" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
