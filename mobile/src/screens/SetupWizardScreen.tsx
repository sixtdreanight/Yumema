/**
 * 设置向导 — 移动端简化版（8 步）
 *
 * 从桌面端 16 步精简为 8 步，适配手机屏幕交互：
 *   1. 伴侣名字    2. 用户性别    3. 伴侣性别
 *   4. 关系类型    5. 关系模式    6. AI 配置
 *   7. 快速模板    8. 确认创建
 */

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadProfile, loadConfig } from "@sixtdreamnight/companion-engine";
import type { WizardData, UserGender, RelationshipType, RelationshipMode } from "../types";
import { useTheme } from "../lib/theme";

const DEFAULTS: WizardData = {
  name: "", userGender: "male", partnerGender: "female",
  relationshipType: "girlfriend", relationshipMode: "direct",
  timezone: "Asia/Shanghai", userCity: "北京", nickname: "宝贝",
  aiProvider: "anthropic", aiModel: "", aiApiKey: "", aiBaseUrl: "",
  aiMaxTokens: 2048, aiTemperature: 0.85,
  partnerAge: 0, partnerCity: "", partnerOccupation: "",
  partnerTemperament: "", partnerHobbies: [], partnerDailyLife: "",
  partnerQuirks: [], speakingStyle: "", memeStyle: "",
};

const TOTAL_STEPS = 8;

export default function SetupWizardScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);
  const theme = useTheme();

  const update = (partial: Partial<WizardData>) => setData((prev) => ({ ...prev, ...partial }));
  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 使用 companion-engine 的 writeFileAtomic / writeEnvFile 保存
      const { writeFileAtomic, writeEnvFile } = await import("@sixtdreamnight/companion-engine");
      const profile = {
        name: data.name, age: data.partnerAge || 25,
        city: data.partnerCity || "上海", occupation: data.partnerOccupation || "",
        education: "", major: "", hobbies: data.partnerHobbies,
        temperament: data.partnerTemperament || "温柔",
        speaking_style: data.speakingStyle || "自然口语化",
        user_nickname: data.nickname, user_gender: data.userGender,
        partner_gender: data.partnerGender, relationship_type: data.relationshipType,
        relationship_mode: data.relationshipMode,
        user_city: data.userCity, user_timezone: data.timezone,
        opinions: {}, daily_life: data.partnerDailyLife || "",
        quirks: data.partnerQuirks, meme_style: data.memeStyle || "",
      };
      await writeFileAtomic("data/profile.json", JSON.stringify(profile, null, 2));
      await writeEnvFile({
        ai: { provider: data.aiProvider, model: data.aiModel || undefined, apiKey: data.aiApiKey || undefined, baseUrl: data.aiBaseUrl || undefined, maxTokens: data.aiMaxTokens, temperature: data.aiTemperature },
      });
      navigation.replace("Chat");
    } catch (err) {
      alert(`保存失败: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>TA 叫什么名字？</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
              value={data.name} onChangeText={(t) => update({ name: t })} placeholder="输入名字..." placeholderTextColor={theme.textMuted} />
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>你的性别</Text>
            {(["male", "female", "other"] as UserGender[]).map((g) => (
              <TouchableOpacity key={g} style={[styles.option, { backgroundColor: data.userGender === g ? theme.primary : theme.surface, borderColor: theme.border }]}
                onPress={() => update({ userGender: g })}>
                <Text style={{ color: data.userGender === g ? "#fff" : theme.text }}>{g === "male" ? "男" : g === "female" ? "女" : "其他"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>TA 的性别</Text>
            {(["male", "female", "other"] as UserGender[]).map((g) => (
              <TouchableOpacity key={g} style={[styles.option, { backgroundColor: data.partnerGender === g ? theme.primary : theme.surface, borderColor: theme.border }]}
                onPress={() => update({ partnerGender: g })}>
                <Text style={{ color: data.partnerGender === g ? "#fff" : theme.text }}>{g === "male" ? "男" : g === "female" ? "女" : "其他"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>TA 是你的？</Text>
            {(["girlfriend", "boyfriend"] as RelationshipType[]).map((r) => (
              <TouchableOpacity key={r} style={[styles.option, { backgroundColor: data.relationshipType === r ? theme.primary : theme.surface, borderColor: theme.border }]}
                onPress={() => update({ relationshipType: r, partnerGender: r === "boyfriend" ? "male" : "female" })}>
                <Text style={{ color: data.relationshipType === r ? "#fff" : theme.text }}>{r === "girlfriend" ? "女朋友" : "男朋友"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>关系模式</Text>
            {(["direct", "slow_burn"] as RelationshipMode[]).map((m) => (
              <TouchableOpacity key={m} style={[styles.option, { backgroundColor: data.relationshipMode === m ? theme.primary : theme.surface, borderColor: theme.border }]}
                onPress={() => update({ relationshipMode: m })}>
                <Text style={{ color: data.relationshipMode === m ? "#fff" : theme.text }}>{m === "direct" ? "直接情侣 — 上来就是恋人" : "养成模式 — 从陌生人慢慢培养"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>AI 服务商</Text>
            {(["anthropic", "openai", "openai-compatible", "ollama"] as const).map((p) => (
              <TouchableOpacity key={p} style={[styles.option, { backgroundColor: data.aiProvider === p ? theme.primary : theme.surface, borderColor: theme.border }]}
                onPress={() => update({ aiProvider: p, aiModel: "" })}>
                <Text style={{ color: data.aiProvider === p ? "#fff" : theme.text }}>{p}</Text>
              </TouchableOpacity>
            ))}
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, marginTop: 12 }]}
              value={data.aiApiKey} onChangeText={(t) => update({ aiApiKey: t })} placeholder="API Key" placeholderTextColor={theme.textMuted} secureTextEntry />
          </View>
        );
      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>快速设置</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
              value={data.partnerTemperament} onChangeText={(t) => update({ partnerTemperament: t })} placeholder="性格（如：温柔、活泼）" placeholderTextColor={theme.textMuted} />
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, marginTop: 8 }]}
              value={data.partnerOccupation} onChangeText={(t) => update({ partnerOccupation: t })} placeholder="职业" placeholderTextColor={theme.textMuted} />
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, marginTop: 8 }]}
              value={data.nickname} onChangeText={(t) => update({ nickname: t })} placeholder="TA 怎么称呼你？" placeholderTextColor={theme.textMuted} />
          </View>
        );
      case 7:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: theme.text }]}>确认</Text>
            <Text style={{ color: theme.textSecondary }}>名字: {data.name}</Text>
            <Text style={{ color: theme.textSecondary }}>关系: {data.relationshipType === "boyfriend" ? "男朋友" : "女朋友"} ({data.relationshipMode === "slow_burn" ? "养成模式" : "直接情侣"})</Text>
            <Text style={{ color: theme.textSecondary }}>AI: {data.aiProvider}</Text>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.5 : 1 }]}
              onPress={saveProfile} disabled={saving || !data.name.trim()}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{saving ? "创建中..." : "创建我的 Yumema"}</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {step > 0 ? <TouchableOpacity onPress={back}><Text style={{ color: theme.primary }}>← 上一步</Text></TouchableOpacity> : <View />}
        <Text style={[styles.title, { color: theme.text }]}>{step + 1}/{TOTAL_STEPS}</Text>
        {step < TOTAL_STEPS - 1 ? <TouchableOpacity onPress={next}><Text style={{ color: theme.primary }}>下一步</Text></TouchableOpacity> : <View />}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  stepContainer: { gap: 12 },
  label: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  option: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 8 },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 24 },
});
