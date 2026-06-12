/**
 * 设置 — AI 配置 + 角色卡编辑
 */

import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadConfig, writeEnvFile, loadProfile, writeFileAtomic } from "@sixtdreamnight/companion-engine";
import { useTheme } from "../lib/theme";

export default function SettingsScreen({ navigation }: any) {
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [maxTokens, setMaxTokens] = useState("2048");
  const [temperature, setTemperature] = useState("0.85");
  const [saving, setSaving] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    (async () => {
      const c = loadConfig();
      setProvider(c.ai.provider);
      setModel(c.ai.model || "");
      setApiKey(c.ai.apiKey ? "••••••••" : "");
      setBaseUrl(c.ai.baseUrl || "");
      setMaxTokens(String(c.ai.maxTokens));
      setTemperature(String(c.ai.temperature));
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await writeEnvFile({
        ai: {
          provider: provider as any,
          model: model || undefined,
          apiKey: apiKey === "••••••••" ? undefined : (apiKey || undefined),
          baseUrl: baseUrl || undefined,
          maxTokens: Number(maxTokens) || 2048,
          temperature: Number(temperature) || 0.85,
        },
      });
      navigation.goBack();
    } catch (err) {
      alert(`保存失败: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.primary }}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>设置</Text>
        <View />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={[styles.label, { color: theme.text }]}>AI 服务商</Text>
        {["anthropic", "openai", "openai-compatible", "ollama"].map((p) => (
          <TouchableOpacity key={p}
            style={[styles.option, { backgroundColor: provider === p ? theme.primary : theme.surface, borderColor: theme.border }]}
            onPress={() => setProvider(p)}>
            <Text style={{ color: provider === p ? "#fff" : theme.text }}>{p}</Text>
          </TouchableOpacity>
        ))}
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} value={apiKey} onChangeText={setApiKey} placeholder="API Key" placeholderTextColor={theme.textMuted} secureTextEntry />
        {(provider === "openai-compatible" || provider === "ollama") && (
          <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} value={baseUrl} onChangeText={setBaseUrl} placeholder="API 地址" placeholderTextColor={theme.textMuted} />
        )}
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} value={model} onChangeText={setModel} placeholder="模型名称（可选）" placeholderTextColor={theme.textMuted} />
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} value={maxTokens} onChangeText={setMaxTokens} placeholder="Max Tokens" keyboardType="numeric" />
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} value={temperature} onChangeText={setTemperature} placeholder="Temperature (0-2)" keyboardType="decimal-pad" />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.5 : 1 }]} onPress={handleSave} disabled={saving}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{saving ? "保存中..." : "保存"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  label: { fontSize: 16, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  option: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 4 },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
});
