import { Heart } from "lucide-react";
import { Flex } from "@radix-ui/themes";
import CardSelect from "../shared/CardSelect";

export default function RelationshipTypeStep({
  data, update,
}: {
  data: { relationshipType: "girlfriend" | "boyfriend"; userGender: string; partnerGender: string };
  update: (d: Partial<{ relationshipType: string }>) => void;
}) {
  const recommended = (() => {
    if (data.userGender === "male" && data.partnerGender === "female") return "girlfriend";
    if (data.userGender === "female" && data.partnerGender === "male") return "boyfriend";
    if (data.userGender === "female" && data.partnerGender === "female") return "girlfriend";
    if (data.userGender === "male" && data.partnerGender === "male") return "boyfriend";
    return null;
  })();

  const isRecommended = (v: string) => v === recommended;

  const options = [
    { value: "girlfriend" as const, label: "女朋友", desc: isRecommended("girlfriend") ? "根据你的选择推荐" : "温柔可爱的她" },
    { value: "boyfriend" as const, label: "男朋友", desc: isRecommended("boyfriend") ? "根据你的选择推荐" : "可靠的另一半" },
  ];

  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="1">
        <h2 className="text-lg font-semibold">你希望 TA 是你的？</h2>
        <p className="text-sm text-muted-foreground">
          {recommended ? "已根据你的选择推荐，你也可以换一个" : "选择你想要的伴侣角色"}
        </p>
      </Flex>
      <CardSelect options={options} value={data.relationshipType} onChange={(v) => update({ relationshipType: v })} />
    </Flex>
  );
}
