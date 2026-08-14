import { Flex, Text, Button, Progress } from "@radix-ui/themes";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useSetupWizard } from "../hooks/useSetupWizard";
import { usePlatform } from "../hooks/usePlatform";
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
  const platform = usePlatform();
  const wizard = useSetupWizard();
  const { step, progress, back, canNext, next, transitioning, transitionTimedOut, error, saveProfile } = wizard;
  const StepComponent = STEPS[step];

  if (transitioning) {
    return (
      <Flex direction="column" align="center" justify="center" height="100vh" gap="4" className="bounce-in"
        style={{ background: "transparent" }}>
        <div className="glass-shine" style={{ maxWidth: 380, width: "100%", borderRadius: 16, padding: 32 }}>
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
          <Flex direction="column" align="center" gap="2">
            <Text size="4" weight="bold">
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
        </div>
      </Flex>
    );
  }

  return (
    <Flex direction="column" height="100vh" style={{ background: "transparent" }}>
      <header style={{
        padding: "16px 24px", paddingTop: platform === "darwin" ? 56 : 16,
        WebkitAppRegion: "drag",
      }}>
        <Flex direction="column" width="100%" gap="2">
          <Progress value={progress} size="1" variant="soft" radius="none" />
          <Flex justify="center" gap="2">
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
      </header>

      <Flex flexGrow="1" align="start" justify="center" style={{ overflowY: "auto", padding: "32px 24px 24px" }}>
        <div className="glass-shine" style={{ width: "100%", maxWidth: 448, borderRadius: 16, padding: 32 }} key={step}>
          <div className="fade-in">
            <StepComponent {...(wizard as any)} />
          </div>
        </div>
      </Flex>

      <div className="glass-shine" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, height: 56, padding: "0 24px", borderRadius: 16 }}>
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
      </div>
    </Flex>
  );
}
