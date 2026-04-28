import CardSelect from "../shared/CardSelect";

export default function RelationshipTypeStep({
  data, update,
}: {
  data: { relationshipType: "girlfriend" | "boyfriend" };
  update: (d: Partial<{ relationshipType: string }>) => void;
}) {
  const options = [
    { value: "girlfriend" as const, label: "女朋友", icon: "💖", desc: "温柔可爱的她" },
    { value: "boyfriend" as const, label: "男朋友", icon: "💙", desc: "可靠的另一半" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">你希望 TA 是你的？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">选择你想要的伴侣角色</p>
      </div>
      <CardSelect options={options} value={data.relationshipType} onChange={(v) => update({ relationshipType: v })} />
    </div>
  );
}
