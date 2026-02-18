import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function groqChat(
  messages: Message[],
  model: string = "llama-3.3-70b-versatile",
  systemPrompt?: string
): Promise<string> {
  const allMessages: Message[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const completion = await groq.chat.completions.create({
    model,
    messages: allMessages,
    max_tokens: 2048,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "No response generated.";
}
