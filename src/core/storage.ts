/**
 * 存储抽象层 — 为移动端（React Native / Capacitor）准备
 *
 * 核心模块通过此接口访问文件系统，而非直接使用 node:fs。
 * Node 环境用 NodeStorage，移动端用 MemoryStorage 或平台实现。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { dirname } from "node:path";

export interface StorageAdapter {
  read(path: string): string;
  write(path: string, data: string): void;
  exists(path: string): boolean;
  mkdir(path: string): void;
  remove(path: string): void;
  /** 原子写入：先写临时文件再重命名，防止崩溃损坏数据 */
  writeAtomic(path: string, data: string): void;
}

// ---- Node.js 实现 ----

export class NodeStorage implements StorageAdapter {
  read(path: string): string {
    return readFileSync(path, "utf-8");
  }

  write(path: string, data: string): void {
    writeFileSync(path, data, "utf-8");
  }

  exists(path: string): boolean {
    return existsSync(path);
  }

  mkdir(path: string): void {
    mkdirSync(path, { recursive: true });
  }

  remove(path: string): void {
    if (existsSync(path)) rmSync(path, { recursive: true });
  }

  writeAtomic(path: string, data: string): void {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = path + "." + Date.now() + ".tmp";
    writeFileSync(tmp, data, "utf-8");
    renameSync(tmp, path);
  }
}

// ---- 内存实现（测试/移动端） ----

export class MemoryStorage implements StorageAdapter {
  private store = new Map<string, string>();

  read(path: string): string {
    const data = this.store.get(path);
    if (data === undefined) throw new Error(`ENOENT: ${path}`);
    return data;
  }

  write(path: string, data: string): void {
    this.store.set(path, data);
  }

  exists(path: string): boolean {
    return this.store.has(path);
  }

  mkdir(_path: string): void {
    // 内存存储无需创建目录
  }

  remove(path: string): void {
    this.store.delete(path);
  }

  writeAtomic(path: string, data: string): void {
    this.store.set(path, data);
  }
}
