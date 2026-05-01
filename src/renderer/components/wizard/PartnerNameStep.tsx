import { Input } from "../ui/Input";
import { Flex } from "@radix-ui/themes";

export default function PartnerNameStep({
  data, update,
}: {
  data: { name: string };
  update: (d: Partial<{ name: string }>) => void;
}) {
  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="1">
        <h2 className="text-lg font-semibold">她叫什么名字？</h2>
        <p className="text-sm text-muted-foreground">给 TA 取一个你喜欢的名字</p>
      </Flex>
      <Input
        type="text"
        value={data.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder="输入名字..."
        autoFocus
      />
    </Flex>
  );
}
