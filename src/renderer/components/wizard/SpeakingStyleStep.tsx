import { Textarea } from "../ui/Input";

export default function SpeakingStyleStep({
  data, update,
}: {
  data: { customStyle: string };
  update: (d: Partial<{ customStyle: string }>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">TA 有什么说话习惯？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">颜文字、口癖、口头禅等，可选填</p>
      </div>
      <Textarea
        value={data.customStyle}
        onChange={(e) => update({ customStyle: e.target.value })}
        placeholder={`例如：\n喜欢用颜文字 (〃▽〃)\n口头禅："你品你细品"`}
        rows={4}
        style={{ lineHeight: "1.8" }}
      />
    </div>
  );
}
