import { Flex, Text, Heading, Button, Callout } from "@radix-ui/themes";
import { Sparkles, AlertTriangle } from "lucide-react";

export default function WelcomeStep({ next }: { next: () => void }) {
  return (
    <Flex direction="column" gap="6">
      <Flex direction="column" align="center" gap="4">
        <Flex
          width="64px" height="64px" align="center" justify="center"
          style={{ borderRadius: "var(--radius-4)", background: "var(--accent-3)" }}
        >
          <Sparkles size={28} color="var(--accent-9)" />
        </Flex>

        <Flex direction="column" align="center" gap="1">
          <Heading size="6">V-Partner</Heading>
          <Text size="2" color="gray">创建属于你的 AI 伴侣</Text>
        </Flex>

        <Text size="2" color="gray" align="center" style={{ maxWidth: 280 }}>
          TA 有自己的性格、爱好和记忆，可以通过 QQ、微信或应用内直接聊天。接下来 14 步完成配置，约 2 分钟。
        </Text>

        <Flex gap="1" style={{ fontSize: 12, color: "var(--gray-10)" }}>
          <span>选择性格</span>
          <span>→</span>
          <span>设置 AI</span>
          <span>→</span>
          <span>连接平台</span>
        </Flex>
      </Flex>

      <Callout.Root color="amber">
        <Callout.Icon>
          <AlertTriangle size={16} />
        </Callout.Icon>
        <Callout.Text>
          <Flex direction="column" gap="1">
            <Text weight="medium" size="1">使用前请阅读</Text>
            <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, lineHeight: 1.6 }}>
              <li>AI 生成内容不代表作者立场，仅供学习娱乐</li>
              <li>QQ 使用第三方协议，建议使用小号</li>
              <li>AI API 按量计费，频繁聊天会产生费用</li>
              <li>请勿透露身份证、银行卡等敏感信息</li>
              <li>TA 不能替代真实人际关系</li>
            </ul>
          </Flex>
        </Callout.Text>
      </Callout.Root>

      <Flex direction="column" gap="3">
        <Button size="4" onClick={next} style={{ width: "100%" }}>
          开始设置
        </Button>
        <Text size="1" color="gray" align="center">14 步简单配置，约 2 分钟完成</Text>
      </Flex>
    </Flex>
  );
}
