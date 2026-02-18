import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function geminiChat(
  messages: Message[],
  model: string = "gemini-1.5-flash",
  systemPrompt?: string
): Promise<string> {
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt || "",
  });

  // Convert to Gemini format (no system role in history)
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text();
}
