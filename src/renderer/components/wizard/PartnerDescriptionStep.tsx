import { useState, useEffect } from "react";
import { Flex } from "@radix-ui/themes";
import type { WizardData } from "../../hooks/useSetupWizard";
import ToggleTag from "../shared/ToggleTag";

interface MBTIEntry {
  type: string;
  label: string;
  description: string;
  temperament: string;
  speakingStyle: string;
  hobbies: string[];
  dailyLife: string;
  quirks: string[];
}

const TEMPERAMENTS = ["温柔", "活泼", "沉稳", "傲娇", "阳光", "内敛", "毒舌", "天然呆"];
const ALL_HOBBIES = ["看剧", "游戏", "运动", "读书", "音乐", "旅行", "美食", "摄影", "绘画", "宅"];
const DAILY_LIFE_PRESETS = [
  { label: "早起党", text: "早上精神最好，晚上容易困。早睡早起型。" },
  { label: "夜猫子", text: "晚上最清醒，早晨起不来。夜猫子型。" },
  { label: "规律作息", text: "早睡早起，按时吃饭，生活有规律。" },
];
const ALL_QUIRKS = ["赖床", "路痴", "吃货", "强迫症", "选择困难", "社恐", "健忘"];

export default function PartnerDescriptionStep({
  data, update,
}: {
  data: WizardData;
  update: (d: Partial<WizardData>) => void;
}) {
  const [mbtiTypes, setMBTITypes] = useState<MBTIEntry[]>([]);
  const [showMBTI, setShowMBTI] = useState(true);

  useEffect(() => {
    window.api.getMBTITypes?.().then((types: unknown) => {
      if (Array.isArray(types)) setMBTITypes(types as MBTIEntry[]);
    });
  }, []);

  const applyMBTI = (mbti: MBTIEntry) => {
    update({
      partnerTemperament: mbti.temperament,
      partnerHobbies: mbti.hobbies,
      partnerDailyLife: mbti.dailyLife,
      partnerQuirks: mbti.quirks,
    });
    setShowMBTI(false);
  };

  const toggleTemperament = (v: string) => {
    const current = data.partnerTemperament ? data.partnerTemperament.split("、") : [];
    const next = current.includes(v) ? current.filter((t) => t !== v) : [...current, v];
    update({ partnerTemperament: next.join("、") });
  };

  const toggleHobby = (v: string) => {
    update({ partnerHobbies: data.partnerHobbies.includes(v) ? data.partnerHobbies.filter((h) => h !== v) : [...data.partnerHobbies, v] });
  };

  const toggleQuirk = (v: string) => {
    update({ partnerQuirks: data.partnerQuirks.includes(v) ? data.partnerQuirks.filter((q) => q !== v) : [...data.partnerQuirks, v] });
  };

  const sectionLabel = "block text-xs font-medium text-muted-foreground mb-2";
  const inputClass = "w-full px-4 py-3 rounded-xl text-base bg-background border border-input text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50";
  const customHint = "text-xs text-muted-foreground mt-1";

  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="1">
        <h2 className="text-base font-semibold">创建角色卡</h2>
        <p className="text-xs text-muted-foreground">填写 TA 的基本信息，让 TA 更像一个真实的人</p>
      </Flex>

      {/* MBTI 快速设定 */}
      {showMBTI && mbtiTypes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={sectionLabel}>MBTI 人格快速设定（可选）</label>
            <button
              type="button"
              onClick={() => setShowMBTI(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              跳过
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {mbtiTypes.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => applyMBTI(m)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors"
                title={m.description}
              >
                <span className="text-xs font-semibold">{m.type}</span>
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">选择一个 MBTI 类型自动填充性格、语气和爱好，也可跳过手动填写</p>
        </div>
      )}

      {/* 基本信息 */}
      <div className="flex gap-2">
        <div style={{ flex: 1 }}>
          <label className={sectionLabel}>年龄</label>
          <input
            type="number" min={16} max={100}
            className={inputClass}
            value={data.partnerAge || ""}
            onChange={(e) => update({ partnerAge: parseInt(e.target.value) || 0 })}
            placeholder="25"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className={sectionLabel}>城市</label>
          <input
            type="text"
            className={inputClass}
            value={data.partnerCity}
            onChange={(e) => update({ partnerCity: e.target.value })}
            placeholder="上海"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div style={{ flex: 1 }}>
          <label className={sectionLabel}>职业</label>
          <input
            type="text"
            className={inputClass}
            value={data.partnerOccupation}
            onChange={(e) => update({ partnerOccupation: e.target.value })}
            placeholder="设计师"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className={sectionLabel}>专业</label>
          <input
            type="text"
            className={inputClass}
            value={data.partnerMajor}
            onChange={(e) => update({ partnerMajor: e.target.value })}
            placeholder="视觉传达"
          />
        </div>
      </div>

      <div>
        <label className={sectionLabel}>学历</label>
        <input
          type="text"
          className={inputClass}
          value={data.partnerEducation}
          onChange={(e) => update({ partnerEducation: e.target.value })}
          placeholder="本科"
        />
      </div>

      {/* 性格标签 + 自定义输入 */}
      <div>
        <label className={sectionLabel}>性格</label>
        <p className="text-xs text-muted-foreground mb-2">决定 TA 说话的语气、对你的态度、处理情绪的方式</p>
        <div className="flex flex-wrap gap-2">
          {TEMPERAMENTS.map((v) => (
            <ToggleTag key={v} active={(data.partnerTemperament || "").split("、").includes(v)} onClick={() => toggleTemperament(v)} variant="violet">{v}</ToggleTag>
          ))}
        </div>
        <p className={customHint}>用"、"分隔多个性格词，也可自由输入</p>
        <input
          type="text"
          className={inputClass + " mt-1"}
          value={data.partnerTemperament}
          onChange={(e) => update({ partnerTemperament: e.target.value })}
          placeholder="温柔、活泼，或输入你自己的描述"
        />
      </div>

      {/* 爱好标签 + 自定义输入 */}
      <div>
        <label className={sectionLabel}>爱好</label>
        <p className="text-xs text-muted-foreground mb-2">影响 TA 和你聊天的日常话题</p>
        <div className="flex flex-wrap gap-2">
          {ALL_HOBBIES.map((h) => (
            <ToggleTag key={h} active={data.partnerHobbies.includes(h)} onClick={() => toggleHobby(h)}>{h}</ToggleTag>
          ))}
        </div>
        <p className={customHint}>输入自定义爱好，用"、"分隔</p>
        <input
          type="text"
          className={inputClass + " mt-1"}
          value={data.partnerHobbies.join("、")}
          onChange={(e) => update({ partnerHobbies: e.target.value ? e.target.value.split(/[、,]/).filter(Boolean) : [] })}
          placeholder="撸猫、探店，或输入你自己的"
        />
      </div>

      {/* 作息节奏 */}
      <div>
        <label className={sectionLabel}>日常节奏</label>
        <p className="text-xs text-muted-foreground mb-2">影响 TA 在不同时间段的状态和心情</p>
        <div className="flex flex-col gap-2">
          {DAILY_LIFE_PRESETS.map((r) => (
            <button
              key={r.label}
              type="button"
              data-on={data.partnerDailyLife === r.text}
              onClick={() => update({ partnerDailyLife: data.partnerDailyLife === r.text ? "" : r.text })}
              className={`flex items-center gap-2 px-6 py-4 rounded-xl text-xs border transition-colors text-left
                data-[on=true]:bg-primary/10 data-[on=true]:border-primary/50 data-[on=true]:text-primary
                hover:bg-muted`}
            >
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.text}</span>
            </button>
          ))}
        </div>
        <p className={customHint}>或输入自定义描述</p>
        <input
          type="text"
          className={inputClass + " mt-1"}
          value={data.partnerDailyLife}
          onChange={(e) => update({ partnerDailyLife: e.target.value })}
          placeholder="凌晨4点睡下午2点起，混乱作息型"
        />
      </div>

      {/* 小特点 + 自定义输入 */}
      <div>
        <label className={sectionLabel}>小特点（选填）</label>
        <p className="text-xs text-muted-foreground mb-2">这些小细节让 TA 更像一个真实的人</p>
        <div className="flex flex-wrap gap-2">
          {ALL_QUIRKS.map((q) => (
            <ToggleTag key={q} active={data.partnerQuirks.includes(q)} onClick={() => toggleQuirk(q)} variant="amber">{q}</ToggleTag>
          ))}
        </div>
        <p className={customHint}>输入自定义小特点，用"、"分隔</p>
        <input
          type="text"
          className={inputClass + " mt-1"}
          value={data.partnerQuirks.join("、")}
          onChange={(e) => update({ partnerQuirks: e.target.value ? e.target.value.split(/[、,]/).filter(Boolean) : [] })}
          placeholder="奶茶续命、外卖达人，或输入你自己的"
        />
      </div>
    </Flex>
  );
}
