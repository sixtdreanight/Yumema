import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Flex, Text, Button } from "@radix-ui/themes";

export default function NotFound() {
  return (
    <Flex direction="column" align="center" justify="center" height="100vh" className="scale-in"
      style={{ background: "transparent" }}>
      <div className="glass-shine" style={{ maxWidth: 380, width: "100%", borderRadius: 16, padding: 32 }}>
        <div className="text-center space-y-4">
          <Flex width="56px" height="56px" align="center" justify="center" mx="auto"
            style={{ borderRadius: "var(--radius-4)", background: "var(--vp-primary-soft)" }}>
            <Compass size={28} color="var(--primary)" />
          </Flex>
          <Flex direction="column" align="center" gap="2">
            <Text size="4" weight="bold">页面不存在</Text>
            <Text size="2" color="gray">你似乎走到了梦的边界，回到熟悉的地方吧</Text>
          </Flex>
          <Flex gap="2" justify="center">
            <Button size="2" asChild>
              <Link to="/chat">回到对话</Link>
            </Button>
            <Button size="2" variant="soft" asChild>
              <Link to="/setup">重新设置</Link>
            </Button>
          </Flex>
        </div>
      </div>
    </Flex>
  );
}
