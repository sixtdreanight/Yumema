/**
 * 聊天主界面 — 移动端
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChat } from "../hooks/useChat";
import { useTheme } from "../lib/theme";

export default function ChatScreen({ navigation }: any) {
  const { messages, typing, profile, sendMessage, regenerate, queueSize, onTypingActivity, placeholder } =
    useChat();
  const [draft, setDraft] = useState("");
  const theme = useTheme();

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft.trim());
    setDraft("");
  };

  const renderMessage = ({ item }: any) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.partnerBubble,
          { backgroundColor: isUser ? theme.primary : theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={{ color: isUser ? "#fff" : theme.text, fontSize: 16 }}>{item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{profile?.name || "Yumema"}</Text>
        {typing && <Text style={{ color: theme.textMuted, fontSize: 12 }}>对方正在输入...</Text>}
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Text style={{ color: theme.primary }}>设置</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, i) => String(i)}
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          inverted={false}
        />

        <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              onTypingActivity();
            }}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            multiline
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border },
            ]}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!draft.trim()}
            style={[styles.sendBtn, { backgroundColor: draft.trim() ? theme.primary : theme.border }]}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>发送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "600" },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    borderWidth: 1,
  },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  partnerBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
  },
});
