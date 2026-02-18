import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function geminiChat(
  messages: Message[],
  model: string = "gemini-2.0-flash",
  systemPrompt?: string,
  webSearch: boolean = false
): Promise<{ response: string; searchedWeb: boolean }> {

  const tools: Record<string, unknown>[] = [];
  if (webSearch) {
    tools.push({ googleSearch: {} });
  }

  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt || "",
    ...(tools.length > 0 ? { tools: tools as never } : {}),
  });

  const history = messages.slice(0, -1)
    .filter(m => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const lastMessage = messages[messages.length - 1];
  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);

  return {
    response: result.response.text(),
    searchedWeb: webSearch
  };
}
