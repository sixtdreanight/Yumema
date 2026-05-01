import { useState } from "react";
import Button from "../ui/Button";
import type { WizardData } from "../../hooks/useSetupWizard";
import { getTemplates, type RoleTemplate } from "../../../core/role-templates";

export default function QuickStartStep({
  next, updateParseField, update,
}: {
  next: () => void;
  updateParseField: (key: string, value: unknown) => void;
  update: (d: Record<string, unknown>) => void;
}) {
  const [importing, setImporting] = useState(false);

  const applyTemplate = (t: RoleTemplate) => {
    update({
      name: t.profile.name,
      partnerGender: t.profile.partner_gender,
      relationshipType: t.profile.relationship_type,
    });
    updateParseField("age", t.profile.age);
    updateParseField("city", t.profile.city);
    updateParseField("occupation", t.profile.occupation);
    updateParseField("temperament", t.profile.temperament);
    updateParseField("hobbies", t.profile.hobbies);
    updateParseField("daily_life", t.profile.daily_life);
    updateParseField("quirks", t.profile.quirks);
    updateParseField("speaking_style", t.profile.speaking_style);
    next();
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await window.api.importCard();
      const r = result as { success?: boolean; data?: Record<string, unknown>; error?: string };
      if (r.success && r.data) {
        const d = r.data;
        if (d.name) update({ name: d.name });
        if (d.age) updateParseField("age", d.age);
        if (d.city) updateParseField("city", d.city);
        if (d.occupation) updateParseField("occupation", d.occupation);
        if (d.temperament) updateParseField("temperament", d.temperament);
        if (d.hobbies) updateParseField("hobbies", d.hobbies);
        if (d.daily_life) updateParseField("daily_life", d.daily_life);
        if (d.quirks) updateParseField("quirks", d.quirks);
        if (d.speaking_style) updateParseField("speaking_style", d.speaking_style);
        next();
      } else if (r.error && r.error !== "已取消") {
        alert(r.error);
      }
    } catch {
      alert("导入失败，请重试");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">选择角色模板</h2>
        <p className="text-xs text-muted-foreground">选一个喜欢的起点，后面可以自定义修改</p>
      </div>

      <div className="flex flex-col gap-3">
        {getTemplates().map((t) => (
          <button
            key={t.key}
            onClick={() => applyTemplate(t)}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors text-left"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-base shrink-0">
              {t.emoji}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">或</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button variant="outline" size="lg" onClick={handleImport} disabled={importing}>
        {importing ? "导入中..." : "导入角色卡 (JSON/PNG)"}
      </Button>

      <Button variant="ghost" size="lg" onClick={next}>
        从空白创建
      </Button>
    </div>
  );
}
