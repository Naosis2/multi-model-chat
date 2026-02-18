import Anthropic from "@anthropic-ai/sdk";
import { webSearch, formatSearchResults } from "./search";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function claudeChat(
  messages: Message[],
  model: string = "claude-haiku-4-5-20251001",
  systemPrompt?: string,
  useWebSearch: boolean = false
): Promise<{ response: string; searchedWeb: boolean }> {
  const filteredMessages = messages.filter((m) => m.role !== "system");
  let searchContext = "";
  let searchedWeb = false;

  if (useWebSearch) {
    const lastMessage = filteredMessages[filteredMessages.length - 1]?.content || "";
    const results = await webSearch(lastMessage);
    if (results.length > 0) {
      searchContext = formatSearchResults(results);
      searchedWeb = true;
    }
  }

  const fullSystem = [
    systemPrompt || "You are a helpful AI assistant for a professional team. Be clear, accurate, and concise.",
    searchContext,
  ].filter(Boolean).join("\n\n");

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: fullSystem,
    messages: filteredMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return {
    response: response.content[0].type === "text" ? response.content[0].text : "No response generated.",
    searchedWeb,
  };
}
