"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Building2, Users, Plus, Trash2, Edit3, Save, X, ArrowLeft,
  Layers, Loader2, AlertCircle, CheckCircle2, BookOpen
} from "lucide-react";

interface KnowledgeEntry {
  id: number;
  layer: string;
  title: string;
  content: string;
  updated_at: string;
}

const LAYER_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  company: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: Building2 },
};

function getLayerStyle(layer: string) {
  return LAYER_COLORS[layer] || { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", icon: Users };
}

const SUGGESTED_DEPARTMENTS = ["Sales", "Marketing", "Engineering", "HR", "Finance", "Leadership", "Operations", "Legal"];

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [layers, setLayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<string>("company");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLayer, setNewLayer] = useState("company");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [customLayer, setCustomLayer] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setEntries(data.entries || []);
      const allLayers = Array.from(new Set(["company", ...(data.layers || [])])) as string[];
      setLayers(allLayers);
    } catch {
      showFeedback("error", "Failed to load knowledge entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleAdd() {
    const layer = newLayer === "__custom__" ? customLayer.toLowerCase().trim() : newLayer;
    if (!layer || !newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layer, title: newTitle, content: newContent }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setNewTitle(""); setNewContent(""); setShowAdd(false);
      setActiveLayer(layer);
      await load();
      showFeedback("success", "Knowledge entry added");
    } catch (e) {
      showFeedback("error", e instanceof Error ? e.message : "Failed to add entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: editTitle, content: editContent }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setEditingId(null);
      await load();
      showFeedback("success", "Entry updated");
    } catch (e) {
      showFeedback("error", e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this knowledge entry? This cannot be undone.")) return;
    try {
      await fetch("/api/knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
      showFeedback("success", "Entry deleted");
    } catch {
      showFeedback("error", "Failed to delete");
    }
  }

  const filtered = entries.filter((e) => e.layer === activeLayer);
  const allLayers = Array.from(new Set(["company", ...layers]));

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1d2e] border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </a>
            <div className="w-px h-5 bg-slate-700" />
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h1 className="font-bold text-white">Knowledge Base Manager</h1>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${
          feedback.type === "success"
            ? "bg-emerald-900/90 text-emerald-300 border border-emerald-500/30"
            : "bg-red-900/90 text-red-300 border border-red-500/30"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      <div className="flex-1 flex max-w-6xl mx-auto w-full px-6 py-6 gap-6">
        {/* Layer sidebar */}
        <div className="w-56 shrink-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Knowledge Layers</div>
          <div className="space-y-1">
            {allLayers.map((layer) => {
              const style = getLayerStyle(layer);
              const Icon = style.icon;
              const count = entries.filter((e) => e.layer === layer).length;
              return (
                <button
                  key={layer}
                  onClick={() => setActiveLayer(layer)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                    activeLayer === layer
                      ? `${style.bg} ${style.text} border ${style.border}`
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="capitalize font-medium">{layer}</span>
                  </div>
                  <span className="text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 p-3 bg-[#1a1d2e] rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-400">How it works</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-400">Company</strong> knowledge is injected for all users.
              <br /><br />
              <strong className="text-slate-400">Department</strong> knowledge is only injected for members of that department.
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(() => { const style = getLayerStyle(activeLayer); const Icon = style.icon;
                return <Icon className={`w-5 h-5 ${style.text}`} />; })()}
              <h2 className="font-semibold text-white capitalize">{activeLayer} Knowledge</h2>
              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{filtered.length} entries</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-400">No entries yet</p>
              <p className="text-sm mt-1">Add knowledge to inform AI responses for {activeLayer === "company" ? "all users" : `the ${activeLayer} department`}</p>
              <button
                onClick={() => { setNewLayer(activeLayer); setShowAdd(true); }}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mx-auto"
              >
                <Plus className="w-4 h-4" /> Add first entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <div key={entry.id} className="bg-[#1a1d2e] rounded-xl border border-slate-700/50 overflow-hidden">
                  {editingId === entry.id ? (
                    <div className="p-4 space-y-3">
                      <input
                        className="w-full bg-[#0f1117] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                      />
                      <textarea
                        className="w-full bg-[#0f1117] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                        rows={5}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Content"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 text-sm transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                          onClick={() => handleUpdate(entry.id)}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-3 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white text-sm">{entry.title}</h3>
                          <p className="text-slate-400 text-sm mt-1 leading-relaxed line-clamp-3">{entry.content}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingId(entry.id); setEditTitle(entry.title); setEditContent(entry.content); }}
                            className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-t border-slate-700/50 flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                          Updated {new Date(entry.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d2e] rounded-2xl border border-slate-700/50 w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="font-semibold text-white">Add Knowledge Entry</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Layer</label>
                <select
                  className="w-full bg-[#0f1117] border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={newLayer}
                  onChange={(e) => setNewLayer(e.target.value)}
                >
                  <option value="company">Company (all users)</option>
                  {SUGGESTED_DEPARTMENTS.map((d) => (
                    <option key={d} value={d.toLowerCase()}>{d} Department</option>
                  ))}
                  <option value="__custom__">Custom department...</option>
                </select>
                {newLayer === "__custom__" && (
                  <input
                    className="w-full mt-2 bg-[#0f1117] border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Department name"
                    value={customLayer}
                    onChange={(e) => setCustomLayer(e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  className="w-full bg-[#0f1117] border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Company Mission Statement"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                <textarea
                  className="w-full bg-[#0f1117] border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  rows={6}
                  placeholder="Paste or type the knowledge content here. This will be automatically injected into AI prompts for eligible users."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving || !newTitle.trim() || !newContent.trim() || (newLayer === "__custom__" && !customLayer.trim())}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
