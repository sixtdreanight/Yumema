import CardSelect from "../shared/CardSelect";

const options = [
  { value: "male" as const, label: "男生", icon: "👦", desc: "TA 会成为你的女友" },
  { value: "female" as const, label: "女生", icon: "👧", desc: "TA 会成为你的男友" },
  { value: "other" as const, label: "其他", icon: "🌈", desc: "性别不限" },
];

export default function UserGenderStep({
  data, update,
}: {
  data: { userGender: string };
  update: (d: Partial<{ userGender: string; relationshipType: string; nickname: string }>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">你的性别是？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">这会影响 TA 如何称呼你和互动</p>
      </div>
      <CardSelect
        options={options}
        value={data.userGender}
        onChange={(v) => {
          update({
            userGender: v,
            relationshipType: v === "male" ? "girlfriend" : "boyfriend",
            nickname: v === "female" ? "宝宝" : "宝贝",
          });
        }}
      />
    </div>
  );
}
