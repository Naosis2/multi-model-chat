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
  // Groq - ultra fast, no web search
  groq_fast: { provider: "groq", model: "llama-3.1-8b-instant", tier: "fast", label: "Llama 3.1 8B (Fast)", supportsWebSearch: false },
  groq_standard: { provider: "groq", model: "llama-3.3-70b-versatile", tier: "standard", label: "Llama 3.3 70B", supportsWebSearch: false },

  // Gemini - with Google Search grounding
  gemini_flash: { provider: "gemini", model: "gemini-2.0-flash", tier: "standard", label: "Gemini 2.0 Flash", supportsWebSearch: true },
  gemini_pro: { provider: "gemini", model: "gemini-2.0-pro", tier: "powerful", label: "Gemini 2.0 Pro", supportsWebSearch: true },

  // Claude - powerful reasoning
  claude_haiku: { provider: "claude", model: "claude-haiku-4-5-20251001", tier: "fast", label: "Claude Haiku (Fast)", supportsWebSearch: false },
  claude_sonnet: { provider: "claude", model: "claude-sonnet-4-6", tier: "powerful", label: "Claude Sonnet", supportsWebSearch: false },

  // OpenAI - with web search
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

  // If web search needed, prefer models that support it
  if (useWeb) {
    if (preferredProvider === "gemini") return MODELS.gemini_flash;
    if (preferredProvider === "openai") return tier === "powerful" ? MODELS.openai_4o : MODELS.openai_mini;
    // Auto with web: default to Gemini (free search) for standard, GPT-4o for powerful
    return tier === "powerful" ? MODELS.gemini_pro : MODELS.gemini_flash;
  }

  // No web search needed
  if (preferredProvider === "claude") return tier === "fast" ? MODELS.claude_haiku : MODELS.claude_sonnet;
  if (preferredProvider === "openai") return tier === "powerful" ? MODELS.openai_4o : MODELS.openai_mini;
  if (preferredProvider === "gemini") return tier === "powerful" ? MODELS.gemini_pro : MODELS.gemini_flash;
  if (preferredProvider === "groq") return tier === "fast" ? MODELS.groq_fast : MODELS.groq_standard;

  // Auto routing: fast=groq, standard=gemini, powerful=claude
  if (tier === "fast") return MODELS.groq_fast;
  if (tier === "powerful") return MODELS.claude_sonnet;
  return MODELS.gemini_flash;
}

// For compare mode - pick two different providers
export const COMPARE_PAIRS: Record<string, [ModelChoice, ModelChoice]> = {
  "groq-gemini": [MODELS.groq_standard, MODELS.gemini_flash],
  "groq-openai": [MODELS.groq_standard, MODELS.openai_mini],
  "groq-claude": [MODELS.groq_standard, MODELS.claude_sonnet],
  "gemini-openai": [MODELS.gemini_flash, MODELS.openai_mini],
  "gemini-claude": [MODELS.gemini_flash, MODELS.claude_sonnet],
  "openai-claude": [MODELS.openai_4o, MODELS.claude_sonnet],
};

// Best Answer ensemble - best combo for quality
export const ENSEMBLE_MODELS = {
  drafter: MODELS.openai_mini,      // Fast, good draft
  critic: MODELS.gemini_flash,       // Google search grounding for fact-check
  synthesizer: MODELS.claude_sonnet, // Claude for best final output
};

export const ALL_PROVIDERS: { id: Provider; label: string; color: string }[] = [
  { id: "auto", label: "Auto", color: "blue" },
  { id: "groq", label: "Groq", color: "emerald" },
  { id: "gemini", label: "Gemini", color: "amber" },
  { id: "openai", label: "ChatGPT", color: "green" },
  { id: "claude", label: "Claude", color: "purple" },
];
