import { NextRequest, NextResponse } from "next/server";
import { getMessages, saveMessage } from "@/lib/db";
import { groqChat } from "@/lib/groq";
import { geminiChat } from "@/lib/gemini";
import { claudeChat } from "@/lib/claude";
import { openaiChat } from "@/lib/openai";
import { autoSelectModel } from "@/lib/router";
import { buildKnowledgeContext } from "@/lib/knowledge";

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, userName, departments = [], forcedProvider, webSearch = false } = await req.json();

    if (!message || !sessionId || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const knowledgeContext = await buildKnowledgeContext(departments);
    const chosen = autoSelectModel(message, forcedProvider, webSearch);

    const history = await getMessages(sessionId);
    const chatHistory = (history as { role: string; content: string }[]).slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const messages = [...chatHistory, { role: "user" as const, content: message }];
    const systemPrompt = knowledgeContext
      ? `You are a helpful AI assistant for a professional team.\n\n${knowledgeContext}`
      : "You are a helpful AI assistant for a professional team. Be clear, accurate, and concise.";

    const useWebSearch = webSearch && chosen.supportsWebSearch;
    let result: { response: string; searchedWeb: boolean };

    if (chosen.provider === "groq") {
      result = await groqChat(messages, chosen.model, systemPrompt, useWebSearch);
    } else if (chosen.provider === "gemini") {
      result = await geminiChat(messages, chosen.model, systemPrompt, useWebSearch);
    } else if (chosen.provider === "claude") {
      result = await claudeChat(messages, chosen.model, systemPrompt, useWebSearch);
    } else {
      result = await openaiChat(messages, chosen.model, systemPrompt, useWebSearch);
    }

    await saveMessage(sessionId, userName, "user", message, "", "single");
    await saveMessage(sessionId, userName, "assistant", result.response, chosen.label, "single");

    return NextResponse.json({
      response: result.response,
      model: chosen.label,
      tier: chosen.tier,
      provider: chosen.provider,
      searchedWeb: result.searchedWeb,
    });
  } catch (e: unknown) {
    console.error("Chat error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
