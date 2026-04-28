import CardSelect from "../shared/CardSelect";

const options = [
  { value: "1", label: "会主动玩梗", desc: "偶尔来一句，用对场景" },
  { value: "2", label: "理解但少用", desc: "懂梗但不会自己主动用" },
  { value: "3", label: "不太懂梗", desc: "网络小白人设，有时候也很可爱" },
];

export default function MemeStyleStep({
  data, update,
}: {
  data: { memeStyle: string };
  update: (d: Partial<{ memeStyle: string }>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">TA 的网络梗风格？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">决定 TA 能不能和你一起玩梗</p>
      </div>
      <CardSelect options={options} value={data.memeStyle} onChange={(v) => update({ memeStyle: v })} />
    </div>
  );
}
