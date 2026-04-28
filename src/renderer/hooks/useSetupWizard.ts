import { useState, useCallback, useMemo } from "react";

export interface WizardData {
  name: string;
  description: string;
  userGender: "male" | "female" | "other";
  relationshipType: "girlfriend" | "boyfriend";
  relationshipMode: "direct" | "slow_burn";
  timezone: string;
  userCity: string;
  nickname: string;
  customStyle: string;
  memeStyle: string;
  aiProvider: "anthropic" | "openai" | "openai-compatible";
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl: string;
  qqEnabled: boolean;
  wechatEnabled: boolean;
  qqWsUrl: string;
  qqAccessToken: string;
  wechatBaseUrl: string;
  wechatFileUrl: string;
}

const TOTAL_STEPS = 14;

const DEFAULTS: WizardData = {
  name: "",
  description: "",
  userGender: "male",
  relationshipType: "girlfriend",
  relationshipMode: "direct",
  timezone: "Asia/Shanghai",
  userCity: "北京",
  nickname: "宝贝",
  customStyle: "",
  memeStyle: "1",
  aiProvider: "anthropic",
  aiModel: "",
  aiApiKey: "",
  aiBaseUrl: "",
  qqEnabled: false,
  wechatEnabled: false,
  qqWsUrl: "ws://127.0.0.1:3001",
  qqAccessToken: "",
  wechatBaseUrl: "http://127.0.0.1:2531/v2/api",
  wechatFileUrl: "http://127.0.0.1:2532/download",
};

export function useSetupWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...DEFAULTS });
  const [parsePreview, setParsePreview] = useState<Record<string, unknown>>({});
  const [riskRead, setRiskRead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionTimedOut, setTransitionTimedOut] = useState(false);

  const update = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const back = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return true;
      case 1: return data.name.trim().length > 0;
      case 2: return true; // description is optional
      case 3: return true;
      case 4: return true;
      case 5: return riskRead;
      case 6: return true;
      case 7: return true;
      case 8: return true;
      case 9: return true;
      case 10: return true;
      case 11: return data.aiApiKey.trim().length > 0;
      case 12: return true;
      case 13: return !saving;
      default: return true;
    }
  }, [step, data, riskRead, saving]);

  const progress = useMemo(() => Math.round((step / (TOTAL_STEPS - 1)) * 100), [step]);

  const handleDescriptionParse = useCallback(async (text: string) => {
    update({ description: text });
    if (text.length < 5) {
      setParsePreview({});
      return;
    }
    try {
      const parsed = await window.api.parseDescription(text);
      setParsePreview(parsed as Record<string, unknown>);
    } catch {
      // parse failed, ignore
    }
  }, [update]);

  const saveProfile = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setTransitionTimedOut(false);
    try {
      const profile = {
        name: data.name,
        age: (parsePreview.age as number) || 25,
        city: (parsePreview.city as string) || "上海",
        occupation: (parsePreview.occupation as string) || "设计师",
        education: (parsePreview.education as string) || "本科",
        major: (parsePreview.major as string) || "设计",
        hobbies: (parsePreview.hobbies as string[]) || ["看剧", "探店"],
        temperament: (parsePreview.temperament as string) || "温柔",
        speaking_style: "自然口语化，喜欢用语气词",
        user_nickname: data.nickname,
        user_gender: data.userGender,
        relationship_type: data.relationshipType,
        relationship_mode: data.relationshipMode,
        user_city: data.userCity,
        user_timezone: data.timezone,
        opinions: {},
        daily_life: "早上赖床，下午容易犯困，晚上精神最好。",
        quirks: (parsePreview.quirks as string[]) || [],
        meme_style: memeStyleText(data.memeStyle),
        custom_style: parseCustomStyle(data.customStyle),
      };

      const result = await window.api.saveProfile({
        profile,
        ai: {
          provider: data.aiProvider,
          model: data.aiModel || undefined,
          apiKey: data.aiApiKey,
          baseUrl: data.aiBaseUrl || undefined,
        },
        qq: data.qqEnabled ? {
          wsUrl: data.qqWsUrl,
          accessToken: data.qqAccessToken,
        } : undefined,
        wechat: data.wechatEnabled ? {
          baseUrl: data.wechatBaseUrl,
          fileUrl: data.wechatFileUrl,
        } : undefined,
      });

      const res = result as { success: boolean; error?: string };
      if (!res.success) {
        setError(res.error || "保存失败，请检查配置后重试");
        return;
      }

      setTransitioning(true);

      // 10 秒超时：如果切换过程卡死，给用户一个退出路径
      const timeoutId = setTimeout(() => setTransitionTimedOut(true), 10000);

      await window.api.transitionToChat();
      await new Promise((r) => setTimeout(r, 400));

      clearTimeout(timeoutId);
      window.location.hash = "#/chat";
    } catch (err) {
      setError(`保存出错: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [data, parsePreview, saving]);

  return {
    step, data, parsePreview, riskRead, saving, error, transitioning, transitionTimedOut, progress,
    update, next, back, canNext, setRiskRead,
    handleDescriptionParse, saveProfile,
    totalSteps: TOTAL_STEPS,
  };
}

function memeStyleText(choice: string): string {
  const map: Record<string, string> = {
    "1": "会主动玩梗，但只在自己确定意思时用。偶尔来一句，不要太密。",
    "2": "理解网络梗和流行语，但自己不主动使用，保持在角色说话风格内。",
    "3": "不太懂网络梗和流行语。用户用了你可能会迷惑地问一下。",
  };
  return map[choice] || map["1"];
}

function parseCustomStyle(raw: string) {
  if (!raw.trim()) return undefined;
  const style: Record<string, unknown> = {};
  if (/颜文字/.test(raw) || /[\(（][^\)）]{2,}[\)）]/.test(raw)) {
    style.emoticons = raw;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}
