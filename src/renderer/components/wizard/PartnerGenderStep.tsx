import { Users } from "lucide-react";
import { Flex } from "@radix-ui/themes";
import CardSelect from "../shared/CardSelect";

const options = [
  { value: "female" as const, label: "女生", desc: "推荐关系：女朋友" },
  { value: "male" as const, label: "男生", desc: "推荐关系：男朋友" },
  { value: "other" as const, label: "都可以", desc: "由你决定关系类型" },
];

export default function PartnerGenderStep({
  data, update,
}: {
  data: { userGender: string; partnerGender: string; relationshipType: string };
  update: (d: Partial<{ partnerGender: string; relationshipType: string }>) => void;
}) {
  const deriveRelationshipType = (userG: string, partnerG: string): string => {
    if (partnerG === "other") return data.relationshipType; // 保持当前选择
    if (userG === "male" && partnerG === "female") return "girlfriend";
    if (userG === "female" && partnerG === "male") return "boyfriend";
    if (userG === "male" && partnerG === "male") return "boyfriend";
    if (userG === "female" && partnerG === "female") return "girlfriend";
    return partnerG === "female" ? "girlfriend" : "boyfriend";
  };

  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="1">
        <h2 className="text-lg font-semibold">你希望 TA 的性别是？</h2>
        <p className="text-sm text-muted-foreground">选择后会为你推荐关系类型，你也可以在下一步修改</p>
      </Flex>
      <CardSelect
        options={options}
        value={data.partnerGender}
        onChange={(v) => {
          update({
            partnerGender: v,
            relationshipType: deriveRelationshipType(data.userGender, v),
          });
        }}
      />
    </Flex>
  );
}
