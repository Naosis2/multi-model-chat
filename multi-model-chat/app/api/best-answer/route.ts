import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "@/lib/db";
import { groqChat } from "@/lib/groq";
import { geminiChat } from "@/lib/gemini";
import { ENSEMBLE_MODELS } from "@/lib/router";
import { buildKnowledgeContext } from "@/lib/knowledge";

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, userName, departments = [] } = await req.json();

    if (!message || !sessionId || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const knowledgeContext = await buildKnowledgeContext(departments);
    const baseSystem = knowledgeContext
      ? `You are a helpful AI assistant for a professional team.\n\n${knowledgeContext}`
      : "You are a helpful AI assistant for a professional team.";

    // Step A: Draft (Groq 70B — fast and good)
    const draft = await groqChat(
      [{ role: "user", content: message }],
      ENSEMBLE_MODELS.drafter.model,
      baseSystem + "\nProvide a thorough, well-structured response."
    );

    // Step B: Critique (Gemini Flash — efficient)
    const critique = await geminiChat(
      [{
        role: "user",
        content: `Review this AI-generated response to the user's question and identify any gaps, inaccuracies, or improvements needed.\n\nUser's question: "${message}"\n\nDraft response:\n${draft}\n\nProvide a concise critique with specific improvement suggestions.`
      }],
      ENSEMBLE_MODELS.critic.model,
      "You are an expert AI response reviewer. Be specific and constructive."
    );

    // Step C: Synthesize (Gemini Pro — best quality)
    const final = await geminiChat(
      [{
        role: "user",
        content: `Synthesize the best possible answer using the draft and the critique below.\n\nUser's question: "${message}"\n\nDraft:\n${draft}\n\nCritique:\n${critique}\n\nWrite the final, improved response directly. Do not mention the draft or critique process.`
      }],
      ENSEMBLE_MODELS.synthesizer.model,
      baseSystem + "\nWrite the final, polished, authoritative response."
    );

    // Save to DB
    await saveMessage(sessionId, userName, "user", message, "", "best-answer");
    await saveMessage(sessionId, userName, "assistant", final, "Best Answer Ensemble", "best-answer");

    return NextResponse.json({
      draft,
      critique,
      final,
      models: {
        drafter: ENSEMBLE_MODELS.drafter.label,
        critic: ENSEMBLE_MODELS.critic.label,
        synthesizer: ENSEMBLE_MODELS.synthesizer.label,
      },
    });
  } catch (e: unknown) {
    console.error("Best answer error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
