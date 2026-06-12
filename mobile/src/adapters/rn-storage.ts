/**
 * React Native StorageAdapter — companion-engine 平台 I/O 的移动端实现
 * 使用 react-native-fs (RNFS) 提供持久化文件存储。
 */

import RNFS from "react-native-fs";
import type { StorageAdapter } from "@sixtdreamnight/companion-engine";

const DATA_ROOT = `${RNFS.DocumentDirectoryPath}/yumema`;

export const rnStorage: StorageAdapter = {
  read: async (p: string) => RNFS.readFile(`${DATA_ROOT}/${p}`, "utf8"),

  write: async (p: string, d: string) => {
    const dir = `${DATA_ROOT}/${p}`.split("/").slice(0, -1).join("/");
    const dirExists = await RNFS.exists(dir);
    if (!dirExists) await RNFS.mkdir(dir);
    await RNFS.writeFile(`${DATA_ROOT}/${p}`, d, "utf8");
  },

  exists: (p: string) => RNFS.exists(`${DATA_ROOT}/${p}`),

  mkdir: (p: string) => RNFS.mkdir(`${DATA_ROOT}/${p}`),

  readdir: (p: string) =>
    RNFS.readDir(`${DATA_ROOT}/${p}`).then((files) => files.map((f) => f.name)),

  unlink: (p: string) => RNFS.unlink(`${DATA_ROOT}/${p}`),

  rmdir: async (p: string, o?: { recursive?: boolean }) => {
    const full = `${DATA_ROOT}/${p}`;
    if (o?.recursive) {
      const items = await RNFS.readDir(full);
      for (const item of items) {
        if (item.isDirectory()) {
          await rnStorage.rmdir(`${p}/${item.name}`, { recursive: true });
        } else {
          await RNFS.unlink(item.path);
        }
      }
    }
    await RNFS.unlink(full);
  },

  stat: async (p: string) => {
    const s = await RNFS.stat(`${DATA_ROOT}/${p}`);
    return { size: Number(s.size), isDirectory: s.isDirectory() };
  },

  writeAtomic: async (p: string, d: string) => {
    const full = `${DATA_ROOT}/${p}`;
    const dir = full.split("/").slice(0, -1).join("/");
    if (!(await RNFS.exists(dir))) await RNFS.mkdir(dir);
    const tmp = `${full}.${Date.now()}.tmp`;
    await RNFS.writeFile(tmp, d, "utf8");
    await RNFS.moveFile(tmp, full);
  },
};
