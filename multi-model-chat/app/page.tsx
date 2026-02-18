"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send, Zap, GitCompare, Trophy, BookOpen, LogOut,
  ChevronDown, Cpu, Loader2, AlertCircle, CheckCircle2,
  Building2, Users, Globe, GlobeOff
} from "lucide-react";
import { ALL_PROVIDERS, MODELS } from "@/lib/router";

type Mode = "single" | "compare" | "best-answer";
type Provider = "groq" | "gemini" | "claude" | "openai" | "auto";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  mode?: Mode;
  compareData?: { modelA: { response: string; model: string; provider: string }; modelB: { response: string; model: string; provider: string } };
  ensembleData?: { draft: string; critique: string; final: string; models: Record<string, string>; searchedWeb?: boolean };
  tier?: string;
  provider?: string;
  searchedWeb?: boolean;
  loading?: boolean;
  error?: boolean;
}

interface UserSession {
  name: string;
  sessionId: string;
  departments: string[];
}

const TIER_COLORS: Record<string, string> = {
  fast: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  standard: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  powerful: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

const PROVIDER_COLORS: Record<string, string> = {
  groq: "text-emerald-400",
  gemini: "text-amber-400",
  openai: "text-green-400",
  claude: "text-purple-400",
};

const AVAILABLE_DEPARTMENTS = [
  "Sales", "Marketing", "Engineering", "HR", "Finance", "Leadership", "Operations", "Legal"
];

// All available model pairs for compare mode
const COMPARE_OPTIONS = [
  { value: "gemini_flash-openai_mini", label: "Gemini Flash vs ChatGPT Mini" },
  { value: "gemini_flash-claude_sonnet", label: "Gemini Flash vs Claude Sonnet" },
  { value: "openai_mini-claude_sonnet", label: "ChatGPT Mini vs Claude Sonnet" },
  { value: "openai_4o-claude_sonnet", label: "GPT-4o vs Claude Sonnet" },
  { value: "gemini_pro-openai_4o", label: "Gemini Pro vs GPT-4o" },
  { value: "groq_standard-gemini_flash", label: "Groq 70B vs Gemini Flash" },
  { value: "groq_standard-openai_mini", label: "Groq 70B vs ChatGPT Mini" },
  { value: "groq_standard-claude_sonnet", label: "Groq 70B vs Claude Sonnet" },
];

export default function Home() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginDepts, setLoginDepts] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("single");
  const [provider, setProvider] = useState<Provider>("auto");
  const [webSearch, setWebSearch] = useState(false);
  const [compareModels, setCompareModels] = useState("gemini_flash-openai_mini");
  const [isLoading, setIsLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [showEnsembleSteps, setShowEnsembleSteps] = useState<Record<string, boolean>>({});
  const [knowledgeLayers, setKnowledgeLayers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/setup").then(r => r.json()).then(d => { if (d.ok) setDbReady(true); }).catch(() => setDbReady(true));
  }, []);

  const fetchLayers = useCallback(async () => {
    const res = await fetch("/api/knowledge");
    const data = await res.json();
    if (data.layers) setKnowledgeLayers(data.layers);
  }, []);

  useEffect(() => { if (user) fetchLayers(); }, [user, fetchLayers]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Auto-enable web search for providers that support it
  useEffect(() => {
    if (provider === "gemini" || provider === "openai") setWebSearch(true);
    if (provider === "groq" || provider === "claude") setWebSearch(false);
  }, [provider]);

  function handleLogin() {
    if (!loginName.trim()) return;
    setUser({
      name: loginName.trim(),
      sessionId: `${loginName.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      departments: loginDepts.map(d => d.toLowerCase()),
    });
  }

  function toggleDept(dept: string) {
    setLoginDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  }

  async function sendMessage() {
    if (!input.trim() || isLoading || !user) return;
    const userMessage = input.trim();
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: userMessage, mode };
    const loadingMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "", loading: true, mode };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      const payload = {
        message: userMessage,
        sessionId: user.sessionId,
        userName: user.name,
        departments: user.departments,
        webSearch,
        forcedProvider: provider !== "auto" ? provider : undefined,
      };

      let assistantMsg: Message;

      if (mode === "compare") {
        const [modelA, modelB] = compareModels.split("-");
        const res = await fetch("/api/compare", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, modelA, modelB }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        assistantMsg = { id: loadingMsg.id, role: "assistant", content: "", compareData: data, mode: "compare" };
      } else if (mode === "best-answer") {
        const res = await fetch("/api/best-answer", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        assistantMsg = { id: loadingMsg.id, role: "assistant", content: data.final, ensembleData: data, mode: "best-answer" };
      } else {
        const res = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        assistantMsg = { id: loadingMsg.id, role: "assistant", content: data.response, model: data.model, tier: data.tier, provider: data.provider, searchedWeb: data.searchedWeb, mode: "single" };
      }

      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? assistantMsg : m));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? {
        ...m, loading: false, error: true,
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong."}`
      } : m));
    } finally {
      setIsLoading(false);
    }
  }

  // ─── LOGIN ───
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Team AI Workspace</h1>
            <p className="text-slate-400 mt-2">Claude · ChatGPT · Gemini · Groq — one place</p>
          </div>
          <div className="bg-[#1a1d2e] rounded-2xl p-6 border border-slate-700/50">
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
              <input
                className="w-full bg-[#0f1117] border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. Taylor Banks"
                value={loginName}
                onChange={e => setLoginName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Departments</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_DEPARTMENTS.map(dept => (
                  <button key={dept} onClick={() => toggleDept(dept)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${loginDepts.includes(dept) ? "bg-blue-600 text-white" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
                    {dept}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleLogin} disabled={!loginName.trim() || !dbReady}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
              {dbReady ? "Enter Workspace" : "Initializing..."}
            </button>
          </div>
          <p className="text-center text-xs text-slate-600 mt-4">Your conversations are private — other team members cannot see them</p>
        </div>
      </div>
    );
  }

  const activeKnowledge = knowledgeLayers.filter(l => l === "company" || user.departments.includes(l));

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1d2e] border-r border-slate-700/50 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Team AI Workspace</span>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.name}</div>
              <div className="text-xs text-slate-400 truncate">{user.departments.length > 0 ? user.departments.join(", ") : "No department"}</div>
            </div>
          </div>
        </div>

        {/* Mode */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Mode</div>
          {[
            { id: "single", label: "Single Model", icon: Zap, desc: "Smart auto routing" },
            { id: "compare", label: "Compare", icon: GitCompare, desc: "Side by side" },
            { id: "best-answer", label: "Best Answer", icon: Trophy, desc: "GPT→Gemini→Claude" },
          ].map(({ id, label, icon: Icon, desc }) => (
            <button key={id} onClick={() => setMode(id as Mode)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 text-left transition-all ${mode === id ? "bg-blue-600/20 border border-blue-500/30 text-blue-300" : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <div><div className="text-sm font-medium">{label}</div><div className="text-xs opacity-60">{desc}</div></div>
            </button>
          ))}
        </div>

        {/* Provider (single mode) */}
        {mode === "single" && (
          <div className="p-4 border-b border-slate-700/50">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">AI Provider</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setProvider(p.id as Provider)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${provider === p.id ? "bg-blue-600 text-white" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compare model picker */}
        {mode === "compare" && (
          <div className="p-4 border-b border-slate-700/50">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Compare Pair</div>
            <select
              value={compareModels}
              onChange={e => setCompareModels(e.target.value)}
              className="w-full bg-[#0f1117] border border-slate-600 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-blue-500">
              {COMPARE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        {/* Web Search Toggle */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Web Search</div>
          <button
            onClick={() => setWebSearch(prev => !prev)}
            disabled={provider === "groq" || provider === "claude"}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              webSearch && provider !== "groq" && provider !== "claude"
                ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-300"
                : "bg-slate-700/30 text-slate-500"
            } ${(provider === "groq" || provider === "claude") ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}>
            {webSearch && provider !== "groq" && provider !== "claude"
              ? <Globe className="w-4 h-4" />
              : <GlobeOff className="w-4 h-4" />}
            <div>
              <div className="text-sm font-medium">{webSearch && provider !== "groq" && provider !== "claude" ? "Search ON" : "Search OFF"}</div>
              <div className="text-xs opacity-60">
                {provider === "groq" || provider === "claude" ? "Not available" : "Live internet results"}
              </div>
            </div>
          </button>
        </div>

        {/* Knowledge */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Knowledge</div>
          {activeKnowledge.length === 0
            ? <p className="text-xs text-slate-600">No knowledge loaded</p>
            : <div className="space-y-1.5">
                {activeKnowledge.includes("company") && <div className="flex items-center gap-2 text-xs text-emerald-400"><Building2 className="w-3.5 h-3.5" /><span>Company</span></div>}
                {activeKnowledge.filter(l => l !== "company").map(l => (
                  <div key={l} className="flex items-center gap-2 text-xs text-blue-400"><Users className="w-3.5 h-3.5" /><span className="capitalize">{l}</span></div>
                ))}
              </div>}
        </div>

        {/* Bottom */}
        <div className="mt-auto p-4 space-y-1">
          <a href="/knowledge" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all w-full">
            <BookOpen className="w-4 h-4" /><span className="text-sm">Knowledge Base</span>
          </a>
          <button onClick={() => { setUser(null); setMessages([]); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all w-full">
            <LogOut className="w-4 h-4" /><span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-[#0f1117]/80 backdrop-blur">
          <div className="flex items-center gap-3">
            {mode === "single" && <Zap className="w-5 h-5 text-emerald-400" />}
            {mode === "compare" && <GitCompare className="w-5 h-5 text-blue-400" />}
            {mode === "best-answer" && <Trophy className="w-5 h-5 text-amber-400" />}
            <div>
              <h2 className="font-semibold text-white text-sm">
                {mode === "single" && `Single Model — ${provider === "auto" ? "Auto Router" : ALL_PROVIDERS.find(p => p.id === provider)?.label}`}
                {mode === "compare" && `Compare: ${COMPARE_OPTIONS.find(o => o.value === compareModels)?.label}`}
                {mode === "best-answer" && "Best Answer — GPT-4o Mini → Gemini → Claude Sonnet"}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                {mode === "single" && "Smart routing by complexity"}
                {mode === "compare" && "Same prompt, two models simultaneously"}
                {mode === "best-answer" && "Draft → Fact-check → Synthesize"}
                {webSearch && provider !== "groq" && provider !== "claude" && (
                  <span className="flex items-center gap-1 text-emerald-400"><Globe className="w-3 h-3" />Web search on</span>
                )}
              </p>
            </div>
          </div>
          {activeKnowledge.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />Knowledge active
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Claude", color: "from-purple-500 to-purple-700" },
                  { label: "ChatGPT", color: "from-green-500 to-green-700" },
                  { label: "Gemini", color: "from-amber-500 to-amber-700" },
                  { label: "Groq", color: "from-emerald-500 to-emerald-700" },
                ].map(({ label, color }) => (
                  <div key={label} className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{label[0]}</span>
                  </div>
                ))}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">All 4 AI models ready</h3>
              <p className="text-slate-400 max-w-sm text-sm">Claude · ChatGPT · Gemini · Groq — with web search for Gemini and ChatGPT. Switch modes in the sidebar.</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`animate-fade-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="max-w-[85%] flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="flex-1">
                    {msg.loading && (
                      <div className="bg-[#1a1d2e] rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-700/50">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">
                            {mode === "best-answer" ? "GPT drafting → Gemini fact-checking → Claude synthesizing..." :
                             mode === "compare" ? "Querying both models simultaneously..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    )}

                    {msg.error && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    )}

                    {/* Compare */}
                    {!msg.loading && !msg.error && msg.mode === "compare" && msg.compareData && (
                      <div className="grid grid-cols-2 gap-3">
                        {[msg.compareData.modelA, msg.compareData.modelB].map((m, i) => (
                          <div key={i} className="bg-[#1a1d2e] rounded-2xl border border-slate-700/50 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-700/30 border-b border-slate-700/50 flex items-center gap-2">
                              <span className={`text-xs font-semibold ${PROVIDER_COLORS[m.provider] || "text-slate-400"}`}>{m.model}</span>
                            </div>
                            <div className="px-4 py-3 prose text-slate-200 text-sm">
                              <ReactMarkdown>{m.response}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Best Answer */}
                    {!msg.loading && !msg.error && msg.mode === "best-answer" && msg.ensembleData && (
                      <div className="space-y-3">
                        <div className="bg-[#1a1d2e] rounded-2xl rounded-tl-sm border border-amber-500/30 overflow-hidden">
                          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-400">Best Answer — Claude Sonnet</span>
                            {msg.ensembleData.searchedWeb && <span className="flex items-center gap-1 text-xs text-emerald-400 ml-auto"><Globe className="w-3 h-3" />Web verified</span>}
                          </div>
                          <div className="px-4 py-3 prose text-slate-200 text-sm">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                        <button onClick={() => setShowEnsembleSteps(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showEnsembleSteps[msg.id] ? "rotate-180" : ""}`} />
                          {showEnsembleSteps[msg.id] ? "Hide" : "Show"} ensemble steps
                        </button>
                        {showEnsembleSteps[msg.id] && (
                          <div className="space-y-2 pl-4 border-l-2 border-slate-700">
                            {[
                              { label: `Step A — Draft (${msg.ensembleData.models.drafter})`, content: msg.ensembleData.draft, color: "text-green-400" },
                              { label: `Step B — Critique (${msg.ensembleData.models.critic})`, content: msg.ensembleData.critique, color: "text-amber-400" },
                            ].map(({ label, content, color }) => (
                              <div key={label} className="bg-[#1a1d2e]/80 rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-700/30 border-b border-slate-700/50">
                                  <span className={`text-xs font-medium ${color}`}>{label}</span>
                                </div>
                                <div className="px-3 py-2 prose text-slate-400 text-xs">
                                  <ReactMarkdown>{content}</ReactMarkdown>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Single */}
                    {!msg.loading && !msg.error && msg.mode === "single" && (
                      <div className="bg-[#1a1d2e] rounded-2xl rounded-tl-sm border border-slate-700/50 overflow-hidden">
                        <div className="px-4 py-3 prose text-slate-200 text-sm">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.model && (
                          <div className="px-4 py-2 border-t border-slate-700/50 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[msg.tier || "standard"]}`}>{msg.tier}</span>
                            <span className={`text-xs font-medium ${PROVIDER_COLORS[msg.provider || ""] || "text-slate-400"}`}>{msg.model}</span>
                            {msg.searchedWeb && <span className="flex items-center gap-1 text-xs text-emerald-400 ml-auto"><Globe className="w-3 h-3" />Searched web</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-[#0f1117]/80 backdrop-blur">
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-[#1a1d2e] border border-slate-600 rounded-2xl overflow-hidden focus-within:border-blue-500 transition-colors">
              <textarea
                className="w-full bg-transparent px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none leading-relaxed"
                placeholder={
                  mode === "single" ? "Ask anything — auto routes to the best model..." :
                  mode === "compare" ? `Compare ${COMPARE_OPTIONS.find(o => o.value === compareModels)?.label}...` :
                  "Ask for the best possible answer (GPT → Gemini → Claude)..."
                }
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                style={{ maxHeight: "160px", overflowY: "auto" }}
              />
            </div>
            <button onClick={sendMessage} disabled={isLoading || !input.trim()}
              className="w-11 h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors shrink-0">
              {isLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-xs text-slate-600">
              {mode === "best-answer" && "~15s — GPT drafts, Gemini fact-checks with Google Search, Claude finalizes"}
              {mode === "compare" && "Runs both models simultaneously"}
              {mode === "single" && webSearch && provider !== "groq" && provider !== "claude" && "🌐 Web search active"}
            </p>
            <p className="text-xs text-slate-600">Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
