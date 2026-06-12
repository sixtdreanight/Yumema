/**
 * Yumema 移动端入口
 *
 * 启动流程:
 *   1. 注入 RN 平台适配器 (RNFS StorageAdapter + AsyncStorage KVStore)
 *   2. 初始化数据根目录
 *   3. 检查 profile → 有则进入聊天，无则进入设置向导
 */

import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  setStorageAdapter,
  setKVStore,
  initDataRoot,
  loadProfile,
} from "@sixtdreamnight/companion-engine";
import { rnStorage } from "./src/adapters/rn-storage";
import { rnKVStore } from "./src/adapters/rn-kvstore";
import RNFS from "react-native-fs";
import ChatScreen from "./src/screens/ChatScreen";
import SetupWizardScreen from "./src/screens/SetupWizardScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import MemoryScreen from "./src/screens/MemoryScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setStorageAdapter(rnStorage);
      setKVStore(rnKVStore);
      await initDataRoot(`${RNFS.DocumentDirectoryPath}/yumema`);
      const profile = await loadProfile();
      setInitialRoute(profile ? "Chat" : "SetupWizard");
    })();
  }, []);

  if (!initialRoute) {
    return null; // splash screen
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="SetupWizard" component={SetupWizardScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Memory" component={MemoryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
