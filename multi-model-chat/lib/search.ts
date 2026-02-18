// Universal web search — used by Claude and Groq since they have no native search

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export async function webSearch(query: string, numResults: number = 5): Promise<SearchResult[]> {
  if (!process.env.SERPER_API_KEY) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: numResults }),
    });

    const data = await res.json();
    const results: SearchResult[] = [];

    // Answer box (direct answer)
    if (data.answerBox?.answer) {
      results.push({
        title: "Direct Answer",
        snippet: data.answerBox.answer,
        link: data.answerBox.link || "",
      });
    }

    // Knowledge graph
    if (data.knowledgeGraph?.description) {
      results.push({
        title: data.knowledgeGraph.title || "Knowledge Graph",
        snippet: data.knowledgeGraph.description,
        link: data.knowledgeGraph.descriptionLink || "",
      });
    }

    // Organic results
    if (data.organic) {
      for (const r of data.organic.slice(0, numResults)) {
        results.push({ title: r.title, snippet: r.snippet || "", link: r.link });
      }
    }

    return results.slice(0, numResults);
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "";
  let context = "## Live Web Search Results\nUse these current results to inform your answer:\n\n";
  results.forEach((r, i) => {
    context += `**[${i + 1}] ${r.title}**\n${r.snippet}\n${r.link ? `Source: ${r.link}` : ""}\n\n`;
  });
  context += "---\nNow answer the user's question using the above search results where relevant. Cite sources where appropriate.\n";
  return context;
}
