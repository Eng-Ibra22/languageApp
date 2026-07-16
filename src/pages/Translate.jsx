import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { localApi } from "@/api/localApi";
import {
  ArrowLeftRight,
  Search,
  Volume2,
  Copy,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Arabic", flag: "🇸🇦" },
  { code: "Turkish", flag: "🇹🇷" },
  { code: "Somali", flag: "🇸🇴" },
];

const HISTORY_KEY = "somspeak_translate_history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {}
}

export default function Translate() {
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Somali");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  const MAX_CHARS = 500;
  const charCount = inputText.length;
  const charPct = (charCount / MAX_CHARS) * 100;

  const handleSwap = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setResult(null);
    setError(null);
  };

  const handleTranslate = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (fromLang === toLang) {
      setError("Source and target languages must be different.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await localApi.translate(trimmed, fromLang, toLang);
      setResult(res);
      const newEntry = {
        from: fromLang,
        to: toLang,
        input: trimmed,
        translation: res.translation,
        ts: Date.now(),
      };
      setHistory((h) => {
        const updated = [newEntry, ...h.slice(0, 14)];
        saveHistory(updated);
        return updated;
      });
    } catch (err) {
      setError(err.message || "Translation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const speak = (text, lang) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang =
      lang === "Arabic" ? "ar" : lang === "Turkish" ? "tr" : lang === "Somali" ? "so" : "en";
    window.speechSynthesis.speak(utter);
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast.success("History cleared");
  };

  const sameLang = fromLang === toLang;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Vocabulary Exchange</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Translate naturally between 4 languages
        </p>
      </motion.div>

      {/* Language Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-3">
          {/* From */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
              From
            </p>
            <div className="flex flex-col gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setFromLang(l.code);
                    setResult(null);
                    setError(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    fromLang === l.code
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{l.flag}</span> {l.code}
                </button>
              ))}
            </div>
          </div>

          {/* Swap */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleSwap}
              className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            {sameLang && (
              <span className="text-[9px] text-destructive text-center font-medium leading-tight max-w-12">
                Same lang!
              </span>
            )}
          </div>

          {/* To */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
              To
            </p>
            <div className="flex flex-col gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setToLang(l.code);
                    setResult(null);
                    setError(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    toLang === l.code
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{l.flag}</span> {l.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-1"
      >
        <textarea
          value={inputText}
          onChange={(e) =>
            setInputText(e.target.value.slice(0, MAX_CHARS))
          }
          onKeyDown={(e) =>
            e.key === "Enter" &&
            !e.shiftKey &&
            (e.preventDefault(), handleTranslate())
          }
          placeholder={`Type a word or phrase in ${fromLang}...`}
          rows={3}
          className="w-full bg-card border border-border rounded-2xl px-4 py-3 pr-10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
        />
        {inputText && (
          <button
            onClick={() => {
              setInputText("");
              setResult(null);
              setError(null);
            }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {/* Character counter */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              charPct > 90
                ? "bg-destructive"
                : charPct > 70
                ? "bg-amber-500"
                : "bg-primary/40"
            }`}
            style={{ width: `${Math.min(charPct, 100)}%` }}
          />
        </div>
        <span
          className={`text-xs font-medium tabular-nums ${
            charPct > 90 ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <button
              onClick={handleTranslate}
              className="shrink-0 hover:opacity-70 transition-opacity"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={handleTranslate}
        disabled={!inputText.trim() || loading || sameLang}
        className="w-full rounded-xl h-12 text-base font-semibold mb-6"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Search className="w-5 h-5 mr-2" />
        )}
        {loading ? "Translating..." : "Translate"}
      </Button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-5 mb-6 space-y-4"
          >
            {/* Translation */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">
                  {toLang} Translation
                </p>
                <p className="text-2xl font-bold text-foreground break-words">
                  {result.translation}
                </p>
                {result.pronunciation && (
                  <p className="text-sm text-muted-foreground mt-1">
                    /{result.pronunciation}/
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => speak(result.translation, toLang)}
                  className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  title="Listen"
                >
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
                <button
                  onClick={() => copy(result.translation)}
                  className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  title="Copy"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Example sentence */}
            {result.example_sentence && (
              <div className="bg-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-semibold mb-1">
                  💬 Example sentence
                </p>
                <p className="text-sm font-medium">{result.example_sentence}</p>
                {result.example_translation && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {result.example_translation}
                  </p>
                )}
              </div>
            )}

            {/* Memory tip */}
            {result.memory_tip && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  💡 Memory tip
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  {result.memory_tip}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-4 h-4" />
              Recent ({history.length})
              <span className="text-xs">{showHistory ? "▲" : "▼"}</span>
            </button>
            <button
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear
            </button>
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mb-4">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setFromLang(h.from);
                        setToLang(h.to);
                        setInputText(h.input);
                        setResult(null);
                        setError(null);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-left gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {h.input}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {h.from} → {h.to}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary truncate max-w-28 shrink-0">
                        {h.translation}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
