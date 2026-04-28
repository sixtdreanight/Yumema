import Button from "../ui/Button";
import Badge from "../ui/Badge";

export default function SummaryStep({
  data, saveProfile, saving, error,
}: {
  data: Record<string, unknown>;
  saveProfile: () => void;
  saving: boolean;
  error?: string;
}) {
  const genderLabel = { male: "男", female: "女", other: "其他" }[data.userGender as string] || "";
  const relationLabel = data.relationshipType === "boyfriend" ? "男朋友" : "女朋友";
  const modeLabel = data.relationshipMode === "slow_burn" ? "养成模式" : "直接情侣";
  const qqLabel = data.qqEnabled ? "已启用" : "未启用";
  const wechatLabel = data.wechatEnabled ? "已启用" : "未启用";

  const rows: Array<[string, string]> = ([
    ["名字", data.name as string],
    ["你的性别", genderLabel],
    ["关系", relationLabel],
    ["模式", modeLabel],
    ["时区", data.timezone as string],
    ["城市", data.userCity as string],
    ["称呼", data.nickname as string],
    ["AI 服务商", data.aiProvider as string],
    ["QQ", qqLabel],
    ["微信", wechatLabel],
  ] as Array<[string, string]>).filter(([, v]) => v);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">确认信息</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">检查一下，没问题就创建你的 TA</p>
      </div>

      <div className="rounded-xl p-5 space-y-3 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-zinc-400 dark:text-zinc-500">{label}</span>
            <span className="font-semibold text-right text-zinc-700 dark:text-zinc-300">{value}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={saveProfile}
        disabled={saving}
        loading={saving}
      >
        {saving ? "创建中..." : "创建我的 V-Partner"}
      </Button>
    </div>
  );
}
