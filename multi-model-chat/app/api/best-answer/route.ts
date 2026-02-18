import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "@/lib/db";
import { openaiChat } from "@/lib/openai";
import { geminiChat } from "@/lib/gemini";
import { claudeChat } from "@/lib/claude";
import { ENSEMBLE_MODELS } from "@/lib/router";
import { buildKnowledgeContext } from "@/lib/knowledge";

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, userName, departments = [], webSearch = false } = await req.json();

    const knowledgeContext = await buildKnowledgeContext(departments);
    const baseSystem = knowledgeContext
      ? `You are a helpful AI assistant for a professional team.\n\n${knowledgeContext}`
      : "You are a helpful AI assistant for a professional team.";

    // Step A: GPT-4o Mini drafts (+ web search if enabled)
    const draftResult = await openaiChat(
      [{ role: "user", content: message }],
      ENSEMBLE_MODELS.drafter.model,
      baseSystem + "\nProvide a thorough, well-structured response.",
      webSearch
    );

    // Step B: Gemini fact-checks with Google Search grounding (always on for critique)
    const critiqueResult = await geminiChat(
      [{ role: "user", content: `Review this AI response and identify gaps, inaccuracies, or improvements.\n\nQuestion: "${message}"\n\nDraft:\n${draftResult.response}\n\nProvide a concise critique with specific improvements.` }],
      ENSEMBLE_MODELS.critic.model,
      "You are an expert AI response reviewer. Be specific and constructive.",
      true
    );

    // Step C: Claude Sonnet synthesizes with web search context if needed
    const finalResult = await claudeChat(
      [{ role: "user", content: `Synthesize the best possible answer using the draft and critique.\n\nQuestion: "${message}"\n\nDraft:\n${draftResult.response}\n\nCritique:\n${critiqueResult.response}\n\nWrite the final improved response directly without mentioning the process.` }],
      ENSEMBLE_MODELS.synthesizer.model,
      baseSystem + "\nWrite the final, polished, authoritative response.",
      webSearch
    );

    await saveMessage(sessionId, userName, "user", message, "", "best-answer");
    await saveMessage(sessionId, userName, "assistant", finalResult.response, "Best Answer Ensemble", "best-answer");

    return NextResponse.json({
      draft: draftResult.response,
      critique: critiqueResult.response,
      final: finalResult.response,
      searchedWeb: webSearch,
      models: {
        drafter: ENSEMBLE_MODELS.drafter.label,
        critic: ENSEMBLE_MODELS.critic.label + " (+ Google Search)",
        synthesizer: ENSEMBLE_MODELS.synthesizer.label,
      },
    });
  } catch (e: unknown) {
    console.error("Best answer error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
