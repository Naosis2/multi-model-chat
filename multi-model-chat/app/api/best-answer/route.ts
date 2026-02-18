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

    // Step A: GPT-4o Mini drafts (fast + optional web search)
    const draftResult = await openaiChat(
      [{ role: "user", content: message }],
      ENSEMBLE_MODELS.drafter.model,
      baseSystem + "\nProvide a thorough, well-structured response.",
      webSearch
    );
    const draft = draftResult.response;

    // Step B: Gemini Flash critiques with Google Search grounding for fact-checking
    const critiqueResult = await geminiChat(
      [{ role: "user", content: `Review this AI response to the question and identify gaps, inaccuracies, or improvements.\n\nQuestion: "${message}"\n\nDraft:\n${draft}\n\nProvide a concise critique with specific improvements.` }],
      ENSEMBLE_MODELS.critic.model,
      "You are an expert AI response reviewer. Be specific and constructive.",
      true // Always use web search for critique/fact-checking
    );
    const critique = critiqueResult.response;

    // Step C: Claude Sonnet synthesizes the best final answer
    const final = await claudeChat(
      [{ role: "user", content: `Synthesize the best possible answer using the draft and critique below.\n\nQuestion: "${message}"\n\nDraft:\n${draft}\n\nCritique:\n${critique}\n\nWrite the final, improved response directly. Do not mention the draft or critique process.` }],
      ENSEMBLE_MODELS.synthesizer.model,
      baseSystem + "\nWrite the final, polished, authoritative response."
    );

    await saveMessage(sessionId, userName, "user", message, "", "best-answer");
    await saveMessage(sessionId, userName, "assistant", final, "Best Answer Ensemble", "best-answer");

    return NextResponse.json({
      draft,
      critique,
      final,
      searchedWeb: webSearch || true,
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
