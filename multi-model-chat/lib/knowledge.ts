import { getKnowledge } from "./db";

export async function buildKnowledgeContext(userDepartments: string[]): Promise<string> {
  const layers = ["company", ...userDepartments];
  const entries = await getKnowledge(layers);

  if (!entries || entries.length === 0) return "";

  const grouped: Record<string, { title: string; content: string }[]> = {};
  for (const entry of entries as { layer: string; title: string; content: string }[]) {
    if (!grouped[entry.layer]) grouped[entry.layer] = [];
    grouped[entry.layer].push({ title: entry.title, content: entry.content });
  }

  let context = "## KNOWLEDGE BASE CONTEXT\nUse this information to inform your responses:\n\n";

  if (grouped["company"]) {
    context += "### Company Knowledge\n";
    for (const e of grouped["company"]) {
      context += `**${e.title}**\n${e.content}\n\n`;
    }
  }

  for (const [layer, items] of Object.entries(grouped)) {
    if (layer === "company") continue;
    context += `### ${layer} Department Knowledge\n`;
    for (const e of items) {
      context += `**${e.title}**\n${e.content}\n\n`;
    }
  }

  context += "---\nNow respond to the user's message using the above context where relevant.\n";
  return context;
}
