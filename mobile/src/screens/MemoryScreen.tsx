/**
 * 记忆管理 — 查看/编辑/删除长期记忆
 */

import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadLongTerm, updateFact, deleteFact } from "@sixtdreamnight/companion-engine";
import { useTheme } from "../lib/theme";

export default function MemoryScreen({ navigation }: any) {
  const [facts, setFacts] = useState<Array<{ topic: string; content: string; confidence: string; mentions: number }>>([]);
  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");
  const theme = useTheme();

  const refresh = async () => {
    const memory = await loadLongTerm();
    setFacts(memory.facts);
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!newTopic.trim() || !newContent.trim()) return;
    await updateFact(newTopic.trim(), newContent.trim());
    setNewTopic("");
    setNewContent("");
    await refresh();
  };

  const handleDelete = async (topic: string) => {
    Alert.alert("删除记忆", `确定要删除 "${topic}" 吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => { await deleteFact(topic); refresh(); } },
    ]);
  };

  const renderFact = ({ item }: any) => (
    <View style={[styles.factCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: "600" }}>{item.topic}</Text>
        <Text style={{ color: theme.textSecondary, marginTop: 4 }}>{item.content}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
          {item.confidence === "high" ? "高" : item.confidence === "medium" ? "中" : "低"} · 提及 {item.mentions} 次
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.topic)}>
        <Text style={{ color: theme.error }}>删除</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.primary }}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>记忆管理</Text>
        <View />
      </View>

      <View style={{ padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} value={newTopic} onChangeText={setNewTopic} placeholder="话题" placeholderTextColor={theme.textMuted} />
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} value={newContent} onChangeText={setNewContent} placeholder="内容" placeholderTextColor={theme.textMuted} />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={handleAdd}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>添加记忆</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={facts}
        renderItem={renderFact}
        keyExtractor={(item) => item.topic}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={<Text style={{ color: theme.textMuted, textAlign: "center", padding: 32 }}>还没有记忆 — 多和 TA 聊聊天吧</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  addBtn: { borderRadius: 12, padding: 12, alignItems: "center" },
  factCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 14 },
});
