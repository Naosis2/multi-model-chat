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
