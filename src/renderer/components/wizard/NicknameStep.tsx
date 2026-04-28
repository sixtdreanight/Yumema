import { Input } from "../ui/Input";

export default function NicknameStep({
  data, update,
}: {
  data: { nickname: string };
  update: (d: Partial<{ nickname: string }>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">TA 怎么称呼你？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">你想让 TA 叫你什么？</p>
      </div>
      <Input
        type="text"
        value={data.nickname}
        onChange={(e) => update({ nickname: e.target.value })}
        placeholder="宝贝 / 宝宝 / 亲爱的..."
        autoFocus
      />
    </div>
  );
}
