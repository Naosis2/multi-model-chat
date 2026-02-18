import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "@/lib/db";
import { groqChat } from "@/lib/groq";
import { geminiChat } from "@/lib/gemini";
import { COMPARE_MODELS } from "@/lib/router";
import { buildKnowledgeContext } from "@/lib/knowledge";

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, userName, departments = [] } = await req.json();

    if (!message || !sessionId || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const knowledgeContext = await buildKnowledgeContext(departments);
    const systemPrompt = knowledgeContext
      ? `You are a helpful AI assistant for a professional team.\n\n${knowledgeContext}`
      : "You are a helpful AI assistant for a professional team. Be clear, accurate, and concise.";

    const messages = [{ role: "user" as const, content: message }];

    // Fire both models in parallel — saves time and tokens
    const [groqResponse, geminiResponse] = await Promise.all([
      groqChat(messages, COMPARE_MODELS.groq.model, systemPrompt),
      geminiChat(messages, COMPARE_MODELS.gemini.model, systemPrompt),
    ]);

    // Save to DB
    await saveMessage(sessionId, userName, "user", message, "", "compare");
    await saveMessage(sessionId, userName, "assistant",
      `**Groq (${COMPARE_MODELS.groq.label}):**\n${groqResponse}\n\n---\n\n**Gemini (${COMPARE_MODELS.gemini.label}):**\n${geminiResponse}`,
      "compare", "compare"
    );

    return NextResponse.json({
      groq: { response: groqResponse, model: COMPARE_MODELS.groq.label },
      gemini: { response: geminiResponse, model: COMPARE_MODELS.gemini.label },
    });
  } catch (e: unknown) {
    console.error("Compare error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
