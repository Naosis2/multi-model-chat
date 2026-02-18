// Smart token router — uses the cheapest model that can handle the task well

export type ModelTier = "fast" | "standard" | "powerful";

export interface ModelChoice {
  provider: "groq" | "gemini";
  model: string;
  tier: ModelTier;
  label: string;
}

// Model definitions
export const MODELS: Record<string, ModelChoice> = {
  // Fast & free — simple tasks
  groq_fast: {
    provider: "groq",
    model: "llama-3.1-8b-instant",
    tier: "fast",
    label: "Llama 3.1 8B (Fast)",
  },
  // Standard — most everyday tasks
  groq_standard: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    tier: "standard",
    label: "Llama 3.3 70B",
  },
  // Google standard
  gemini_flash: {
    provider: "gemini",
    model: "gemini-1.5-flash",
    tier: "standard",
    label: "Gemini 1.5 Flash",
  },
  // Most powerful — synthesis, complex reasoning
  gemini_pro: {
    provider: "gemini",
    model: "gemini-1.5-pro",
    tier: "powerful",
    label: "Gemini 1.5 Pro",
  },
};

// Keywords that signal a task needs a powerful model
const COMPLEX_SIGNALS = [
  "synthesize", "summarize everything", "analyze in depth", "compare and contrast",
  "write a detailed", "create a comprehensive", "evaluate", "critique", "strategic",
  "multi-step", "step by step plan", "pros and cons", "legal", "financial",
  "technical architecture", "review this document", "rewrite", "improve this",
];

// Keywords that are clearly simple lookups
const SIMPLE_SIGNALS = [
  "what is", "define", "who is", "when did", "how many", "quick", "briefly",
  "tldr", "short answer", "yes or no", "summarize in one", "spell check",
];

export function classifyPrompt(message: string): ModelTier {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;

  // Very short messages → fast
  if (wordCount < 15 && !COMPLEX_SIGNALS.some((s) => lower.includes(s))) {
    return "fast";
  }

  // Simple signal keywords → fast
  if (SIMPLE_SIGNALS.some((s) => lower.includes(s)) && wordCount < 40) {
    return "fast";
  }

  // Complex signals → powerful
  if (COMPLEX_SIGNALS.some((s) => lower.includes(s)) || wordCount > 120) {
    return "powerful";
  }

  // Default → standard
  return "standard";
}

export function selectModel(
  tier: ModelTier,
  preferredProvider?: "groq" | "gemini"
): ModelChoice {
  if (tier === "fast") return MODELS.groq_fast;
  if (tier === "powerful") {
    return preferredProvider === "groq" ? MODELS.groq_standard : MODELS.gemini_pro;
  }
  // Standard
  if (preferredProvider === "gemini") return MODELS.gemini_flash;
  return MODELS.groq_standard;
}

export function autoSelectModel(message: string, preferredProvider?: "groq" | "gemini"): ModelChoice {
  const tier = classifyPrompt(message);
  return selectModel(tier, preferredProvider);
}

// For compare mode — one of each provider at standard tier
export const COMPARE_MODELS = {
  groq: MODELS.groq_standard,
  gemini: MODELS.gemini_flash,
};

// For best answer ensemble
export const ENSEMBLE_MODELS = {
  drafter: MODELS.groq_standard,   // Fast draft
  critic: MODELS.gemini_flash,      // Efficient critique
  synthesizer: MODELS.gemini_pro,   // Best final output
};
