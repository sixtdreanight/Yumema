/**
 * React Native KVStore — companion-engine 键值存储的移动端实现
 * 使用 @react-native-async-storage/async-storage。
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KVStore } from "@sixtdreamnight/companion-engine";

export const rnKVStore: KVStore = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  delete: (key: string) => AsyncStorage.removeItem(key),
};
