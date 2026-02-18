export type ModelTier = "fast" | "standard" | "powerful";
export type Provider = "groq" | "gemini" | "claude" | "openai" | "auto";

export interface ModelChoice {
  provider: "groq" | "gemini" | "claude" | "openai";
  model: string;
  tier: ModelTier;
  label: string;
  supportsWebSearch: boolean;
}

export const MODELS: Record<string, ModelChoice> = {
  // Groq - ultra fast, web search via Serper injection
  groq_fast: { provider: "groq", model: "llama-3.1-8b-instant", tier: "fast", label: "Llama 3.1 8B (Fast)", supportsWebSearch: true },
  groq_standard: { provider: "groq", model: "llama-3.3-70b-versatile", tier: "standard", label: "Llama 3.3 70B", supportsWebSearch: true },

  // Gemini - native Google Search grounding
  gemini_flash: { provider: "gemini", model: "gemini-2.0-flash", tier: "standard", label: "Gemini 2.0 Flash", supportsWebSearch: true },
  gemini_pro: { provider: "gemini", model: "gemini-2.0-flash", tier: "powerful", label: "Gemini 2.0 Flash Pro", supportsWebSearch: true },

  // Claude - web search via Serper injection
  claude_haiku: { provider: "claude", model: "claude-haiku-4-5-20251001", tier: "fast", label: "Claude Haiku (Fast)", supportsWebSearch: true },
  claude_sonnet: { provider: "claude", model: "claude-sonnet-4-6", tier: "powerful", label: "Claude Sonnet", supportsWebSearch: true },

  // OpenAI - native web search
  openai_mini: { provider: "openai", model: "gpt-4o-mini", tier: "standard", label: "GPT-4o Mini", supportsWebSearch: true },
  openai_4o: { provider: "openai", model: "gpt-4o", tier: "powerful", label: "GPT-4o", supportsWebSearch: true },
};

const COMPLEX_SIGNALS = [
  "synthesize", "summarize everything", "analyze in depth", "compare and contrast",
  "write a detailed", "create a comprehensive", "evaluate", "critique", "strategic",
  "multi-step", "step by step plan", "pros and cons", "legal", "financial",
  "technical architecture", "review this document", "rewrite", "improve this",
];

const SIMPLE_SIGNALS = [
  "what is", "define", "who is", "when did", "how many", "quick", "briefly",
  "tldr", "short answer", "yes or no", "summarize in one", "spell check",
];

const WEB_SIGNALS = [
  "today", "latest", "current", "recent", "news", "now", "price", "weather",
  "stock", "score", "update", "this week", "this month", "2024", "2025", "2026",
  "who won", "what happened", "live", "right now", "search", "find online",
];

export function classifyPrompt(message: string): { tier: ModelTier; needsWeb: boolean } {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;
  const needsWeb = WEB_SIGNALS.some((s) => lower.includes(s));

  if (wordCount < 15 && !COMPLEX_SIGNALS.some((s) => lower.includes(s))) {
    return { tier: "fast", needsWeb };
  }
  if (SIMPLE_SIGNALS.some((s) => lower.includes(s)) && wordCount < 40) {
    return { tier: "fast", needsWeb };
  }
  if (COMPLEX_SIGNALS.some((s) => lower.includes(s)) || wordCount > 120) {
    return { tier: "powerful", needsWeb };
  }
  return { tier: "standard", needsWeb };
}

export function autoSelectModel(message: string, preferredProvider?: Provider, webSearchEnabled?: boolean): ModelChoice {
  const { tier, needsWeb } = classifyPrompt(message);
  const useWeb = webSearchEnabled || needsWeb;

  if (preferredProvider === "claude") return tier === "fast" ? MODELS.claude_haiku : MODELS.claude_sonnet;
  if (preferredProvider === "openai") return tier === "powerful" ? MODELS.openai_4o : MODELS.openai_mini;
  if (preferredProvider === "gemini") return tier === "powerful" ? MODELS.gemini_pro : MODELS.gemini_flash;
  if (preferredProvider === "groq") return tier === "fast" ? MODELS.groq_fast : MODELS.groq_standard;

  // Auto: fast=groq, standard=gemini (has native search), powerful=claude
  if (tier === "fast") return MODELS.groq_fast;
  if (tier === "powerful") return useWeb ? MODELS.gemini_pro : MODELS.claude_sonnet;
  return MODELS.gemini_flash;
}

export const COMPARE_PAIRS: Record<string, [ModelChoice, ModelChoice]> = {
  "gemini_flash-openai_mini": [MODELS.gemini_flash, MODELS.openai_mini],
  "gemini_flash-claude_sonnet": [MODELS.gemini_flash, MODELS.claude_sonnet],
  "openai_mini-claude_sonnet": [MODELS.openai_mini, MODELS.claude_sonnet],
  "openai_4o-claude_sonnet": [MODELS.openai_4o, MODELS.claude_sonnet],
  "gemini_pro-openai_4o": [MODELS.gemini_pro, MODELS.openai_4o],
  "groq_standard-gemini_flash": [MODELS.groq_standard, MODELS.gemini_flash],
  "groq_standard-openai_mini": [MODELS.groq_standard, MODELS.openai_mini],
  "groq_standard-claude_sonnet": [MODELS.groq_standard, MODELS.claude_sonnet],
};

export const ENSEMBLE_MODELS = {
  drafter: MODELS.openai_mini,
  critic: MODELS.gemini_flash,
  synthesizer: MODELS.claude_sonnet,
};

export const ALL_PROVIDERS: { id: Provider; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "groq", label: "Groq" },
  { id: "gemini", label: "Gemini" },
  { id: "openai", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
];
