import { Sparkles, AlertTriangle } from "lucide-react";
import { useSetupWizard } from "../hooks/useSetupWizard";
import WelcomeStep from "../components/wizard/WelcomeStep";
import PartnerNameStep from "../components/wizard/PartnerNameStep";
import PartnerDescriptionStep from "../components/wizard/PartnerDescriptionStep";
import UserGenderStep from "../components/wizard/UserGenderStep";
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
import { Button } from "../components/ui/button";

const STEPS = [
  WelcomeStep, PartnerNameStep, PartnerDescriptionStep,
  UserGenderStep, RelationshipTypeStep, RelationshipModeStep,
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
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 bounce-in">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: transitionTimedOut ? "var(--vp-error-soft)" : "var(--vp-primary-soft)" }}
          >
            {transitionTimedOut
              ? <AlertTriangle className="w-8 h-8 text-destructive" />
              : <Sparkles className="w-8 h-8 text-primary" />
            }
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {transitionTimedOut ? "启动超时" : "正在创建你的 AI 伴侣..."}
            </h2>
            <p className="text-sm mt-1 text-muted-foreground">
              {transitionTimedOut ? "窗口切换可能未响应，请手动重试" : "一切准备就绪"}
            </p>
          </div>
          {transitionTimedOut && (
            <Button variant="primary" size="sm" onClick={saveProfile}>
              点击重试
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col select-none bg-background">
      <div className="h-[2px] shrink-0 bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${progress}%`,
            transition: "width 600ms var(--ease-spring)",
          }}
        />
      </div>

      <div className="flex justify-center gap-1.5 py-3 shrink-0">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === step ? 22 : 6,
              height: 6,
              background:
                i === step
                  ? "var(--primary)"
                  : i < step
                    ? "var(--vp-primary-light)"
                    : "var(--border)",
              transition: "all 400ms var(--ease-spring)",
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-4 overflow-y-auto">
        <div className="w-full max-w-sm" key={step}>
          <div className="fade-in">
            <StepComponent {...(wizard as any)} />
          </div>
        </div>
      </div>

      <div className="h-12 flex items-center justify-between px-6 shrink-0 border-t border-border" style={{ background: "var(--background)" }}>
        <div>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={back}>← 上一步</Button>
          )}
        </div>

        <span className="text-xs font-mono text-muted-foreground">
          {step + 1}/{STEPS.length}
        </span>

        <div>
          {step < STEPS.length - 1 && (
            <Button variant="primary" size="sm" onClick={next} disabled={!canNext}>
              下一步
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
