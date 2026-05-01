import { Input } from "../ui/Input";
import { Flex } from "@radix-ui/themes";

export default function UserCityStep({
  data, update,
}: {
  data: { userCity: string };
  update: (d: Partial<{ userCity: string }>) => void;
}) {
  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="1">
        <h2 className="text-lg font-semibold">你在哪个城市？</h2>
        <p className="text-sm text-muted-foreground">TA 会和你聊天气、本地话题</p>
      </Flex>
      <Input
        type="text"
        value={data.userCity}
        onChange={(e) => update({ userCity: e.target.value })}
        placeholder="例如：北京"
        autoFocus
      />
    </Flex>
  );
}
