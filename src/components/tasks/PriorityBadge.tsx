const MAP: Record<string, { label: string; cls: string }> = {
  LOW: { label: "Low", cls: "badge-slate" },
  MEDIUM: { label: "Medium", cls: "badge-blue" },
  HIGH: { label: "High", cls: "badge-orange" },
  URGENT: { label: "Urgent", cls: "badge-red" },
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const p = MAP[priority] ?? { label: priority, cls: "badge-slate" };
  return <span className={`badge ${p.cls}`}>{p.label}</span>;
}
