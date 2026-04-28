import { Input } from "../ui/Input";

export default function UserCityStep({
  data, update,
}: {
  data: { userCity: string };
  update: (d: Partial<{ userCity: string }>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">你在哪个城市？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">TA 会和你聊天气、本地话题</p>
      </div>
      <Input
        type="text"
        value={data.userCity}
        onChange={(e) => update({ userCity: e.target.value })}
        placeholder="例如：北京"
        autoFocus
      />
    </div>
  );
}
