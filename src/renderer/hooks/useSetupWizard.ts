import { useState, useCallback, useMemo, useRef, useEffect } from "react";

export interface WizardData {
  name: string;
  userGender: "male" | "female" | "other";
  partnerGender: "male" | "female" | "other";
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
  aiMaxTokens: number;
  aiTemperature: number;
  qqEnabled: boolean;
  wechatEnabled: boolean;
  qqWsUrl: string;
  qqAccessToken: string;
  wechatBaseUrl: string;
  wechatFileUrl: string;
  // 角色卡字段
  partnerAge: number;
  partnerCity: string;
  partnerOccupation: string;
  partnerEducation: string;
  partnerMajor: string;
  partnerTemperament: string;
  partnerHobbies: string[];
  partnerDailyLife: string;
  partnerQuirks: string[];
}

const TOTAL_STEPS = 16;

const DEFAULTS: WizardData = {
  name: "",
  userGender: "male",
  partnerGender: "female",
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
  aiMaxTokens: 2048,
  aiTemperature: 0.85,
  qqEnabled: false,
  wechatEnabled: false,
  qqWsUrl: "ws://127.0.0.1:3001",
  qqAccessToken: "",
  wechatBaseUrl: "http://127.0.0.1:2531/v2/api",
  wechatFileUrl: "http://127.0.0.1:2532/download",
  partnerAge: 0,
  partnerCity: "",
  partnerOccupation: "",
  partnerEducation: "",
  partnerMajor: "",
  partnerTemperament: "",
  partnerHobbies: [],
  partnerDailyLife: "",
  partnerQuirks: [],
};

export function useSetupWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...DEFAULTS });
  const [riskRead, setRiskRead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionTimedOut, setTransitionTimedOut] = useState(false);
  const mountedRef = useRef(true);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const update = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  // 将角色卡解析字段映射到 WizardData（供 QuickStartStep 使用）
  const fieldMap: Record<string, keyof WizardData> = {
    age: "partnerAge",
    city: "partnerCity",
    occupation: "partnerOccupation",
    temperament: "partnerTemperament",
    hobbies: "partnerHobbies",
    daily_life: "partnerDailyLife",
    quirks: "partnerQuirks",
    speaking_style: "customStyle",
  };

  const updateParseField = useCallback((key: string, value: unknown) => {
    const mapped = fieldMap[key];
    if (mapped) {
      setData((prev) => ({ ...prev, [mapped]: value }));
    }
  }, []);

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const back = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return true;  // Welcome
      case 1: return true;  // QuickStart
      case 2: return data.name.trim().length > 0;  // PartnerName
      case 3: return true;  // PartnerDescription optional
      case 4: return true;  // UserGender
      case 5: return true;  // PartnerGender
      case 6: return true;  // RelationshipType
      case 7: return riskRead;  // RelationshipMode
      case 8: return true;  // Timezone
      case 9: return true;  // UserCity
      case 10: return true; // Nickname
      case 11: return true; // SpeakingStyle
      case 12: return true; // MemeStyle
      case 13: return data.aiProvider === "ollama" || data.aiApiKey.trim().length > 0;  // AIProvider (Ollama 无需 key)
      case 14: return true; // PlatformSetup
      case 15: return !saving;  // Summary
      default: return true;
    }
  }, [step, data, riskRead, saving]);

  const progress = useMemo(() => Math.round((step / (TOTAL_STEPS - 1)) * 100), [step]);

  const saveProfile = useCallback(async () => {
    if (saving) return;
    const d = dataRef.current;
    setSaving(true);
    setError("");
    setTransitionTimedOut(false);
    try {
      const profile = {
        name: d.name,
        age: d.partnerAge || 0,
        city: d.partnerCity || "",
        occupation: d.partnerOccupation || "",
        education: d.partnerEducation || "",
        major: d.partnerMajor || "",
        hobbies: d.partnerHobbies || [],
        temperament: d.partnerTemperament || "",
        speaking_style: d.customStyle || "",
        user_nickname: d.nickname,
        user_gender: d.userGender,
        partner_gender: d.partnerGender,
        relationship_type: d.relationshipType,
        relationship_mode: d.relationshipMode,
        user_city: d.userCity,
        user_timezone: d.timezone,
        opinions: {},
        daily_life: d.partnerDailyLife || "",
        quirks: d.partnerQuirks || [],
        meme_style: memeStyleText(d.memeStyle),
        custom_style: parseCustomStyle(d.customStyle),
      };

      const result = await window.api.saveProfile({
        profile,
        ai: {
          provider: d.aiProvider,
          model: d.aiModel || undefined,
          apiKey: d.aiApiKey,
          baseUrl: d.aiBaseUrl || undefined,
          maxTokens: d.aiMaxTokens,
          temperature: d.aiTemperature,
        },
        qq: d.qqEnabled ? {
          wsUrl: d.qqWsUrl,
          accessToken: d.qqAccessToken,
        } : undefined,
        wechat: d.wechatEnabled ? {
          baseUrl: d.wechatBaseUrl,
          fileUrl: d.wechatFileUrl,
        } : undefined,
      });

      const res = result as { success: boolean; error?: string };
      if (!res.success) {
        setError(res.error || "保存失败，请检查配置后重试");
        return;
      }

      setTransitioning(true);

      // 10 秒超时：如果切换过程卡死，给用户一个退出路径
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) setTransitionTimedOut(true);
      }, 10000);

      await window.api.transitionToChat();
      await new Promise((r) => setTimeout(r, 400));

      clearTimeout(timeoutId);
      window.location.hash = "#/chat";
    } catch (err) {
      setError(`保存出错: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return {
    step, data, riskRead, saving, error, transitioning, transitionTimedOut, progress,
    update, updateParseField, next, back, canNext, setRiskRead,
    saveProfile,
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
