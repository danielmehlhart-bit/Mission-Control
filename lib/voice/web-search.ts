export type VoiceWebSearchContextSize = "low" | "medium" | "high";

export type VoiceWebSearchInput = {
  query: string;
  searchContextSize?: VoiceWebSearchContextSize;
  allowedDomains?: string[];
  blockedDomains?: string[];
  fetchImpl?: typeof fetch;
};

export type VoiceWebSearchSource = {
  url: string;
  title: string;
};

export type VoiceWebSearchResult = {
  answerable: boolean;
  summary: string;
  query: string;
  sources: VoiceWebSearchSource[];
  searchedAt: string;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const CONTEXT_SIZES: VoiceWebSearchContextSize[] = ["low", "medium", "high"];
const MAX_DOMAINS = 12;
const MAX_SOURCES = 8;

function requireOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY required for voice web search");
  }
  return apiKey;
}

function normalizeContextSize(value: unknown): VoiceWebSearchContextSize {
  return typeof value === "string" && CONTEXT_SIZES.includes(value as VoiceWebSearchContextSize)
    ? value as VoiceWebSearchContextSize
    : "medium";
}

function normalizeDomains(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const domains = value
    .filter((domain): domain is string => typeof domain === "string")
    .map((domain) => domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean)
    .filter((domain, index, all) => all.indexOf(domain) === index)
    .slice(0, MAX_DOMAINS);
  return domains.length ? domains : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function collectTextAndSources(value: unknown, texts: string[], sources: VoiceWebSearchSource[]) {
  const record = asRecord(value);
  if (!record) return;

  if (typeof record.text === "string" && record.text.trim()) {
    texts.push(record.text.trim());
  }

  const maybeUrl = typeof record.url === "string" ? record.url.trim() : "";
  if (maybeUrl) {
    sources.push({
      url: maybeUrl,
      title: typeof record.title === "string" && record.title.trim() ? record.title.trim() : maybeUrl,
    });
  }

  const annotations = Array.isArray(record.annotations) ? record.annotations : [];
  for (const annotation of annotations) {
    const annotationRecord = asRecord(annotation);
    if (!annotationRecord) continue;
    const url = typeof annotationRecord.url === "string" ? annotationRecord.url.trim() : "";
    if (!url) continue;
    sources.push({
      url,
      title: typeof annotationRecord.title === "string" && annotationRecord.title.trim()
        ? annotationRecord.title.trim()
        : url,
    });
  }

  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      child.forEach((item) => collectTextAndSources(item, texts, sources));
    } else if (child && typeof child === "object") {
      collectTextAndSources(child, texts, sources);
    }
  }
}

function dedupeSources(sources: VoiceWebSearchSource[]): VoiceWebSearchSource[] {
  const seen = new Set<string>();
  const deduped: VoiceWebSearchSource[] = [];
  for (const source of sources) {
    if (!source.url || seen.has(source.url)) continue;
    seen.add(source.url);
    deduped.push(source);
    if (deduped.length >= MAX_SOURCES) break;
  }
  return deduped;
}

export async function runVoiceWebSearch(input: VoiceWebSearchInput): Promise<VoiceWebSearchResult> {
  const query = input.query.trim();
  if (!query) {
    throw new Error("query required");
  }

  const filters: Record<string, string[]> = {};
  const allowedDomains = normalizeDomains(input.allowedDomains);
  const blockedDomains = normalizeDomains(input.blockedDomains);
  if (allowedDomains) filters.allowed_domains = allowedDomains;
  if (blockedDomains) filters.blocked_domains = blockedDomains;

  const webSearchTool: Record<string, unknown> = {
    type: "web_search",
    search_context_size: normalizeContextSize(input.searchContextSize),
  };
  if (Object.keys(filters).length) {
    webSearchTool.filters = filters;
  }

  const response = await (input.fetchImpl ?? fetch)(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MC_VOICE_WEB_SEARCH_MODEL?.trim() || "gpt-5.5",
      tools: [webSearchTool],
      tool_choice: { type: "web_search" },
      input: [
        {
          role: "system",
          content: "Search the web for current facts. Return a concise German answer with citations in annotations when available.",
        },
        { role: "user", content: query },
      ],
    }),
  });

  const data = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(`OpenAI web search failed (${response.status}): ${JSON.stringify(data).slice(0, 240)}`);
  }

  const texts: string[] = [];
  const sources: VoiceWebSearchSource[] = [];
  collectTextAndSources(data, texts, sources);
  const summary = texts.find((text) => text.length > 0)?.slice(0, 1800) ?? "Keine verwertbare Websearch-Antwort erhalten.";
  const dedupedSources = dedupeSources(sources);

  return {
    answerable: dedupedSources.length > 0 || !/^Keine verwertbare/.test(summary),
    summary,
    query,
    sources: dedupedSources,
    searchedAt: new Date().toISOString(),
  };
}
