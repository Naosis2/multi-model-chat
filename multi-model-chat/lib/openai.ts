import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function openaiChat(
  messages: Message[],
  model: string = "gpt-4o-mini",
  systemPrompt?: string,
  webSearch: boolean = false
): Promise<{ response: string; searchedWeb: boolean }> {
  const actualModel = webSearch
    ? model.includes("mini") ? "gpt-4o-mini-search-preview" : "gpt-4o-search-preview"
    : model;

  const allMessages = systemPrompt
    ? [{ role: "system" as const, content: systemPrompt }, ...messages.filter(m => m.role !== "system")]
    : messages.filter(m => m.role !== "system");

  const completion = await openai.chat.completions.create({
    model: actualModel,
    messages: allMessages.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
    max_tokens: 2048,
  });

  return {
    response: completion.choices[0]?.message?.content || "No response generated.",
    searchedWeb: webSearch
  };
}
