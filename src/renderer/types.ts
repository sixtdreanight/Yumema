import type { VPapi } from "../main/preload";

declare global {
  interface Window {
    api: VPapi;
  }
}

export {};
