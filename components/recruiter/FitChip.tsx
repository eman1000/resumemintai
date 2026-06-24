// Small colored chip showing a candidate's fit category at a glance.

const MAP: Record<string, { label: string; cls: string }> = {
  strong: { label: "Strong fit", cls: "bg-green-100 text-green-800" },
  possible: { label: "Possible", cls: "bg-mint-50 text-mint-700" },
  stretch: { label: "Stretch", cls: "bg-amber-100 text-amber-800" },
  underqualified: { label: "Under-qualified", cls: "bg-gray-100 text-gray-700" },
  overqualified: { label: "Over-qualified", cls: "bg-purple-100 text-purple-800" },
  different_field: { label: "Different field", cls: "bg-orange-100 text-orange-800" },
};

export default function FitChip({ category }: { category?: string | null }) {
  if (!category || !MAP[category]) return null;
  const { label, cls } = MAP[category];
  return <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${cls}`}>{label}</span>;
}
