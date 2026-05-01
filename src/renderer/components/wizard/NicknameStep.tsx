import { Input } from "../ui/Input";
import { Flex } from "@radix-ui/themes";

export default function NicknameStep({
  data, update,
}: {
  data: { nickname: string };
  update: (d: Partial<{ nickname: string }>) => void;
}) {
  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="1">
        <h2 className="text-lg font-semibold">TA 怎么称呼你？</h2>
        <p className="text-sm text-muted-foreground">你想让 TA 叫你什么？</p>
      </Flex>
      <Input
        type="text"
        value={data.nickname}
        onChange={(e) => update({ nickname: e.target.value })}
        placeholder="宝贝 / 宝宝 / 亲爱的..."
        autoFocus
      />
    </Flex>
  );
}
