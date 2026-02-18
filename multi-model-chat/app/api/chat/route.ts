import { NextRequest, NextResponse } from "next/server";
import { getMessages, saveMessage } from "@/lib/db";
import { groqChat } from "@/lib/groq";
import { geminiChat } from "@/lib/gemini";
import { autoSelectModel } from "@/lib/router";
import { buildKnowledgeContext } from "@/lib/knowledge";

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, userName, departments = [], forcedProvider } = await req.json();

    if (!message || !sessionId || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build knowledge context for this user
    const knowledgeContext = await buildKnowledgeContext(departments);

    // Auto-select model based on message complexity
    const chosen = autoSelectModel(message, forcedProvider);

    // Get conversation history (last 20 messages for context)
    const history = await getMessages(sessionId);
    const chatHistory = (history as { role: string; content: string }[]).slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Add current message
    const messages = [...chatHistory, { role: "user" as const, content: message }];

    // Build system prompt
    const systemPrompt = knowledgeContext
      ? `You are a helpful AI assistant for a professional team.\n\n${knowledgeContext}`
      : "You are a helpful AI assistant for a professional team. Be clear, accurate, and concise.";

    // Call selected model
    let response: string;
    if (chosen.provider === "groq") {
      response = await groqChat(messages, chosen.model, systemPrompt);
    } else {
      response = await geminiChat(messages, chosen.model, systemPrompt);
    }

    // Save to DB (user message + assistant response)
    await saveMessage(sessionId, userName, "user", message, "", "single");
    await saveMessage(sessionId, userName, "assistant", response, chosen.label, "single");

    return NextResponse.json({
      response,
      model: chosen.label,
      tier: chosen.tier,
      provider: chosen.provider,
    });
  } catch (e: unknown) {
    console.error("Chat error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
