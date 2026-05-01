import { Sparkles } from "lucide-react";
import { Flex } from "@radix-ui/themes";
import Button from "../ui/Button";
import { Badge } from "../ui/Badge";
import { GlassCard } from "../ui/GlassCard";

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
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="1">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">确认信息</h2>
        </div>
        <p className="text-sm text-muted-foreground">检查一下，没问题就创建你的 TA</p>
      </Flex>

      <GlassCard variant="solid" padding="p-4">
        <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-right">{value}</span>
          </div>
        ))}
        </div>
      </GlassCard>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={saveProfile}
        disabled={saving}
        loading={saving}
      >
        {saving ? "创建中..." : "创建我的 Yumema"}
      </Button>
    </Flex>
  );
}
