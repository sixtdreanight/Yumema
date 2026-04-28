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
import Button from "../components/ui/Button";

const STEPS = [
  WelcomeStep, PartnerNameStep, PartnerDescriptionStep,
  UserGenderStep, RelationshipTypeStep, RelationshipModeStep,
  TimezoneStep, UserCityStep, NicknameStep,
  SpeakingStyleStep, MemeStyleStep, AIProviderStep,
  PlatformSetupStep, SummaryStep,
];

export default function SetupWizard() {
  const wizard = useSetupWizard();
  const { step, progress, back, canNext, next, transitioning, error } = wizard;
  const StepComponent = STEPS[step];

  if (transitioning) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4 scale-in">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--vp-primary-soft), #ede9fe)" }}
          >
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">正在创建你的 AI 伴侣...</h2>
            <p className="text-sm mt-1 text-zinc-400 dark:text-zinc-500">一切准备就绪</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col select-none bg-zinc-50 dark:bg-zinc-950">
      {/* Progress bar */}
      <div className="h-[3px] shrink-0 bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full transition-all duration-600 ease-out bg-gradient-to-r from-violet-500 to-indigo-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-1.5 py-3 shrink-0">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-400"
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              background:
                i === step
                  ? "linear-gradient(to right, var(--vp-primary), var(--vp-accent))"
                  : i < step
                    ? "var(--vp-primary-light)"
                    : "var(--vp-border)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 overflow-y-auto">
        <div className="w-full max-w-sm" key={step}>
          <div className="fade-in">
            <StepComponent {...(wizard as any)} />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-14 flex items-center justify-between px-6 shrink-0 glass border-t border-zinc-200/60 dark:border-zinc-700/60">
        <div>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={back}>← 上一步</Button>
          )}
        </div>

        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
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
