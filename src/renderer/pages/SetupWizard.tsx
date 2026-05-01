import { Flex, Text, Button, Progress } from "@radix-ui/themes";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useSetupWizard } from "../hooks/useSetupWizard";
import TitleBar from "../components/shared/TitleBar";
import { GlassCard } from "../components/ui/GlassCard";
import WelcomeStep from "../components/wizard/WelcomeStep";
import QuickStartStep from "../components/wizard/QuickStartStep";
import PartnerNameStep from "../components/wizard/PartnerNameStep";
import PartnerDescriptionStep from "../components/wizard/PartnerDescriptionStep";
import UserGenderStep from "../components/wizard/UserGenderStep";
import PartnerGenderStep from "../components/wizard/PartnerGenderStep";
import RelationshipTypeStep from "../components/wizard/RelationshipTypeStep";
import RelationshipModeStep from "../components/wizard/RelationshipModeStep";
import TimezoneStep from "../components/wizard/TimezoneStep";
import UserCityStep from "../components/wizard/UserCityStep";
import NicknameStep from "../components/wizard/NicknameStep";
import SpeakingStyleStep from "../components/wizard/SpeakingStyleStep";
import MemeStyleStep from "../components/wizard/MemeStyleStep";
import AIProviderStep from "../components/wizard/AIProviderStep";
import PlatformSetupStep from "../components/wizard/PlatformSetupStep";
import SummaryStep from "../components/wizard/SummaryStep";

const STEPS = [
  WelcomeStep, QuickStartStep, PartnerNameStep, PartnerDescriptionStep,
  UserGenderStep, PartnerGenderStep, RelationshipTypeStep, RelationshipModeStep,
  TimezoneStep, UserCityStep, NicknameStep,
  SpeakingStyleStep, MemeStyleStep, AIProviderStep,
  PlatformSetupStep, SummaryStep,
];

export default function SetupWizard() {
  const wizard = useSetupWizard();
  const { step, progress, back, canNext, next, transitioning, transitionTimedOut, error, saveProfile } = wizard;
  const StepComponent = STEPS[step];

  if (transitioning) {
    return (
      <Flex direction="column" align="center" justify="center" height="100vh" gap="4" className="bounce-in"
        style={{ background: "transparent" }}>
        <GlassCard padding="p-8" style={{ maxWidth: 380 }}>
          <div className="text-center space-y-4">
          <Flex width="64px" height="64px" align="center" justify="center" mx="auto"
            style={{
              borderRadius: "var(--radius-4)",
              background: transitionTimedOut ? "var(--red-3)" : "var(--accent-3)",
            }}>
            {transitionTimedOut
              ? <AlertTriangle size={32} color="var(--red-9)" />
              : <Sparkles size={32} color="var(--accent-9)" />
            }
          </Flex>
          <Flex direction="column" align="center" gap="1">
            <Text size="4" weight="semibold">
              {transitionTimedOut ? "启动超时" : "正在创建你的 AI 伴侣..."}
            </Text>
            <Text size="2" color="gray">
              {transitionTimedOut ? "窗口切换可能未响应，请手动重试" : "一切准备就绪"}
            </Text>
          </Flex>
          {transitionTimedOut && (
            <Button size="2" onClick={saveProfile}>点击重试</Button>
          )}
          </div>
        </GlassCard>
      </Flex>
    );
  }

  return (
    <Flex direction="column" height="100vh" style={{ background: "transparent" }}>
      <TitleBar borderColor="transparent" background="transparent">
        <Flex direction="column" width="100%" gap="1">
          <Progress value={progress} size="1" variant="soft" radius="none" />
          <Flex justify="center" gap="1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 22 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === step ? "var(--accent-9)" : i < step ? "var(--accent-5)" : "var(--gray-5)",
                  transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
            ))}
          </Flex>
        </Flex>
      </TitleBar>

      <Flex flexGrow="1" align="center" justify="center" px="6" py="6" style={{ overflowY: "auto" }}>
        <GlassCard padding="p-8" style={{ width: "100%", maxWidth: 448 }} key={step}>
          <div className="fade-in">
            <StepComponent {...(wizard as any)} />
          </div>
        </GlassCard>
      </Flex>

      <GlassCard padding="px-6 py-3" className="flex items-center justify-between flex-shrink-0 h-[56px]">
        <Flex align="center" justify="between" style={{ width: "100%" }}>
        <div>
          {step > 0 && (
            <Button variant="ghost" size="2" onClick={back}>← 上一步</Button>
          )}
        </div>

        <Text size="1" color="gray" style={{ fontFamily: "var(--default-font-family)" }}>
          {step + 1}/{STEPS.length}
        </Text>

        <div>
          {step < STEPS.length - 1 && (
            <Button size="2" onClick={next} disabled={!canNext}>
              下一步
            </Button>
          )}
        </div>
        </Flex>
      </GlassCard>
    </Flex>
  );
}
