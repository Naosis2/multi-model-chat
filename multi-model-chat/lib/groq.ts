import Groq from "groq-sdk";
import { webSearch, formatSearchResults } from "./search";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function groqChat(
  messages: Message[],
  model: string = "llama-3.3-70b-versatile",
  systemPrompt?: string,
  useWebSearch: boolean = false
): Promise<{ response: string; searchedWeb: boolean }> {
  let searchContext = "";
  let searchedWeb = false;

  if (useWebSearch) {
    const lastMessage = messages.filter(m => m.role !== "system").slice(-1)[0]?.content || "";
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

  const allMessages: Message[] = [
    { role: "system", content: fullSystem },
    ...messages.filter(m => m.role !== "system"),
  ];

  const completion = await groq.chat.completions.create({
    model,
    messages: allMessages,
    max_tokens: 2048,
    temperature: 0.7,
  });

  return {
    response: completion.choices[0]?.message?.content || "No response generated.",
    searchedWeb,
  };
}
