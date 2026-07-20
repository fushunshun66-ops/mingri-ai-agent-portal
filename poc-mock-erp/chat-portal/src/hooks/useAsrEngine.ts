import { useState } from "react";
import type { AsrEngine } from "../types/voice";

const STORAGE_KEY = "asrEngine";
const VALID: AsrEngine[] = ["funasr", "qwen"];

function readFromStorage(): AsrEngine {
  const raw = localStorage.getItem(STORAGE_KEY);
  return VALID.includes(raw as AsrEngine) ? (raw as AsrEngine) : "qwen";
}

export function useAsrEngine(): { engine: AsrEngine; setEngine: (e: AsrEngine) => void } {
  const [engine, setEngineState] = useState<AsrEngine>(readFromStorage);

  function setEngine(e: AsrEngine) {
    localStorage.setItem(STORAGE_KEY, e);
    setEngineState(e);
  }

  return { engine, setEngine };
}
