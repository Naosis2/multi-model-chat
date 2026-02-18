import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "@/lib/db";
import { groqChat } from "@/lib/groq";
import { geminiChat } from "@/lib/gemini";
import { claudeChat } from "@/lib/claude";
import { openaiChat } from "@/lib/openai";
import { MODELS, ModelChoice } from "@/lib/router";
import { buildKnowledgeContext } from "@/lib/knowledge";

async function callModel(
  model: ModelChoice,
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
  webSearch: boolean
): Promise<string> {
  if (model.provider === "groq") {
    const r = await groqChat(messages, model.model, systemPrompt);
    return r.response;
  }
  if (model.provider === "claude") {
    return claudeChat(messages, model.model, systemPrompt);
  }
  if (model.provider === "gemini") {
    const r = await geminiChat(messages, model.model, systemPrompt, webSearch && model.supportsWebSearch);
    return r.response;
  }
  const r = await openaiChat(messages, model.model, systemPrompt, webSearch && model.supportsWebSearch);
  return r.response;
}

export async function POST(req: NextRequest) {
  try {
    const {
      message, sessionId, userName, departments = [],
      modelA = "gemini_flash", modelB = "openai_mini", webSearch = false
    } = await req.json();

    const knowledgeContext = await buildKnowledgeContext(departments);
    const systemPrompt = knowledgeContext
      ? `You are a helpful AI assistant for a professional team.\n\n${knowledgeContext}`
      : "You are a helpful AI assistant for a professional team. Be clear, accurate, and concise.";

    const chosenA = MODELS[modelA] || MODELS.gemini_flash;
    const chosenB = MODELS[modelB] || MODELS.openai_mini;
    const messages = [{ role: "user" as const, content: message }];

    const [responseA, responseB] = await Promise.all([
      callModel(chosenA, messages, systemPrompt, webSearch),
      callModel(chosenB, messages, systemPrompt, webSearch),
    ]);

    await saveMessage(sessionId, userName, "user", message, "", "compare");
    await saveMessage(sessionId, userName, "assistant",
      `**${chosenA.label}:**\n${responseA}\n\n---\n\n**${chosenB.label}:**\n${responseB}`,
      "compare", "compare"
    );

    return NextResponse.json({
      modelA: { response: responseA, model: chosenA.label, provider: chosenA.provider },
      modelB: { response: responseB, model: chosenB.label, provider: chosenB.provider },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
