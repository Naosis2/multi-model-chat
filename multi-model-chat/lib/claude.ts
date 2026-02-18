import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function claudeChat(
  messages: Message[],
  model: string = "claude-haiku-4-5-20251001",
  systemPrompt?: string
): Promise<string> {
  const filteredMessages = messages.filter((m) => m.role !== "system");

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt || "You are a helpful AI assistant for a professional team. Be clear, accurate, and concise.",
    messages: filteredMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return response.content[0].type === "text" ? response.content[0].text : "No response generated.";
}
