import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Sparkles,
  BookOpen,
  WifiOff,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Arabic",  flag: "🇸🇦" },
  { code: "Turkish", flag: "🇹🇷" },
  { code: "Somali",  flag: "🇸🇴" },
];
const HISTORY_KEY = "somspeak_translate_history";
const MAX_CHARS   = 500;

const PROVIDER_LABELS = {
  deepl:          { name: "DeepL",        color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  libretranslate: { name: "LibreTranslate",color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" },
  google:         { name: "Google Translate",color:"text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  "google-free":  { name: "Google AI",    color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50" },
  azure:          { name: "Azure Translator",color:"text-sky-600 dark:text-sky-400",    bg: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800" },
  custom:         { name: "AI Translator", color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
  generic:        { name: "AI Translator", color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
};

const ERROR_ICONS = {
  API_AUTH_ERROR: ShieldAlert,
  API_TIMEOUT:    Clock,
  NETWORK:        WifiOff,
  default:        AlertCircle,
};

// ─── History helpers ──────────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated pulsing skeleton while translating */
function TranslationSkeleton({ toLang }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-5 mb-6 space-y-4"
    >
      <div className="space-y-3">
        <div className="h-3 w-20 bg-muted rounded-full animate-pulse" />
        <div className="h-8 w-3/4 bg-muted rounded-xl animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded-full animate-pulse opacity-60" />
      </div>
      <div className="bg-card rounded-xl p-4 space-y-2">
        <div className="h-3 w-28 bg-muted rounded-full animate-pulse" />
        <div className="h-3 w-full bg-muted rounded-full animate-pulse opacity-70" />
        <div className="h-3 w-4/5 bg-muted rounded-full animate-pulse opacity-50" />
      </div>
    </motion.div>
  );
}

/** Source badge — AI Powered vs Built-in Dictionary */
function SourceBadge({ source, provider, fallback }) {
  if (source === "ai") {
    const p = PROVIDER_LABELS[provider] || PROVIDER_LABELS.generic;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.bg} ${p.color}`}>
        <Sparkles className="w-2.5 h-2.5" />
        {p.name}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border
      ${fallback
        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
        : "bg-muted border-border text-muted-foreground"
      }`}>
      <BookOpen className="w-2.5 h-2.5" />
      {fallback ? "Built-in (AI unavailable)" : "Built-in dictionary"}
    </span>
  );
}

/** Error banner with contextual icon + retry */
function ErrorBanner({ error, errorCode, onRetry }) {
  const Icon = ERROR_ICONS[errorCode] || ERROR_ICONS.default;
  const isApiError = ["API_AUTH_ERROR", "API_TIMEOUT", "NETWORK"].includes(errorCode);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-start gap-3 p-4 mb-4 rounded-xl border ${
        isApiError
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
          : "bg-destructive/10 border-destructive/20"
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isApiError ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isApiError ? "text-amber-700 dark:text-amber-300" : "text-destructive"}`}>
          {error}
        </p>
        {errorCode === "API_AUTH_ERROR" && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Set <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">TRANSLATION_API_KEY</code> in your Railway environment variables.
          </p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Retry"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Translate() {
  const [fromLang,    setFromLang]    = useState("English");
  const [toLang,      setToLang]      = useState("Somali");
  const [inputText,   setInputText]   = useState("");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [errorCode,   setErrorCode]   = useState(null);
  const [history,     setHistory]     = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch translation capability config once on mount
  const { data: config } = useQuery({
    queryKey: ["translation-config"],
    queryFn:  () => localApi.translationConfig(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const aiEnabled  = config?.aiEnabled  ?? false;
  const provider   = config?.provider   ?? "generic";
  const charCount  = inputText.length;
  const charPct    = (charCount / MAX_CHARS) * 100;
  const sameLang   = fromLang === toLang;

  const handleSwap = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setResult(null);
    setError(null);
    setErrorCode(null);
  };

  const handleTranslate = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sameLang) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setErrorCode(null);
    try {
      const res = await localApi.translate(trimmed, fromLang, toLang);
      setResult(res);
      const newEntry = {
        from: fromLang, to: toLang, input: trimmed,
        translation: res.translation, source: res.source, ts: Date.now(),
      };
      setHistory((h) => {
        const updated = [newEntry, ...h.filter((e) => !(e.input === trimmed && e.from === fromLang && e.to === toLang)).slice(0, 14)];
        saveHistory(updated);
        return updated;
      });
    } catch (err) {
      // Parse error code from server response if present
      const code = err.code || (
        err.message?.includes("credentials") ? "API_AUTH_ERROR" :
        err.message?.includes("timed out")   ? "API_TIMEOUT"    :
        err.message?.includes("fetch")       ? "NETWORK"        : "default"
      );
      setError(err.message || "Translation failed. Please try again.");
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text, lang) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "Arabic" ? "ar" : lang === "Turkish" ? "tr" : lang === "Somali" ? "so" : "en";
    window.speechSynthesis.speak(u);
  };

  const copy = (text) => navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast.success("History cleared");
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-bold">Vocabulary Exchange</h1>
          {/* AI / Dictionary mode badge */}
          <div className="mt-1">
            {aiEnabled ? (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${PROVIDER_LABELS[provider]?.bg} ${PROVIDER_LABELS[provider]?.color}`}>
                <Sparkles className="w-3 h-3" />
                AI Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                <BookOpen className="w-3 h-3" />
                Dictionary
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {aiEnabled
            ? `Powered by ${PROVIDER_LABELS[provider]?.name || "AI"} · Translate between 4 languages`
            : "Built-in phrase lookup · Add an API key to unlock AI translation"}
        </p>
      </motion.div>

      {/* ── Language selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-3">
          {/* From */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">From</p>
            <div className="flex flex-col gap-1.5">
              {LANGUAGES.map((l) => (
                <button key={l.code}
                  onClick={() => { setFromLang(l.code); setResult(null); setError(null); setErrorCode(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                    ${fromLang === l.code ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  <span>{l.flag}</span>{l.code}
                </button>
              ))}
            </div>
          </div>

          {/* Swap */}
          <div className="flex flex-col items-center gap-2">
            <button onClick={handleSwap}
              className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            {sameLang && (
              <span className="text-[9px] text-destructive text-center font-medium leading-tight max-w-12">
                Same!
              </span>
            )}
          </div>

          {/* To */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">To</p>
            <div className="flex flex-col gap-1.5">
              {LANGUAGES.map((l) => (
                <button key={l.code}
                  onClick={() => { setToLang(l.code); setResult(null); setError(null); setErrorCode(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                    ${toLang === l.code ? "bg-accent text-accent-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  <span>{l.flag}</span>{l.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Text input ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-1"
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleTranslate())}
          placeholder={`Type or paste text in ${fromLang}…`}
          rows={3}
          className="w-full bg-card border border-border rounded-2xl px-4 py-3 pr-10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground transition-shadow"
        />
        {inputText && (
          <button
            onClick={() => { setInputText(""); setResult(null); setError(null); setErrorCode(null); }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {/* Character counter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              charPct > 90 ? "bg-destructive" : charPct > 70 ? "bg-amber-500" : "bg-primary/40"
            }`}
            style={{ width: `${Math.min(charPct, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-medium tabular-nums ${charPct > 90 ? "text-destructive" : "text-muted-foreground"}`}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <ErrorBanner
            error={error}
            errorCode={errorCode}
            onRetry={handleTranslate}
          />
        )}
      </AnimatePresence>

      {/* Translate button */}
      <Button
        onClick={handleTranslate}
        disabled={!inputText.trim() || loading || sameLang}
        className="w-full rounded-xl h-12 text-base font-semibold mb-6 relative overflow-hidden"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Translating…
          </>
        ) : (
          <>
            {aiEnabled ? <Sparkles className="w-5 h-5 mr-2" /> : <Search className="w-5 h-5 mr-2" />}
            Translate
          </>
        )}
      </Button>

      {/* ── Result / skeleton ── */}
      <AnimatePresence mode="wait">
        {loading && (
          <TranslationSkeleton key="skeleton" toLang={toLang} />
        )}

        {!loading && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-5 mb-6 space-y-4"
          >
            {/* Translation text */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    {toLang} Translation
                  </p>
                  <SourceBadge
                    source={result.source}
                    provider={provider}
                    fallback={result.fallback}
                  />
                </div>
                <p className="text-2xl font-bold text-foreground break-words leading-snug">
                  {result.translation}
                </p>
                {result.pronunciation && (
                  <p className="text-sm text-muted-foreground mt-1">/{result.pronunciation}/</p>
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
                <p className="text-xs text-muted-foreground font-semibold mb-1">💬 Example</p>
                <p className="text-sm font-medium">{result.example_sentence}</p>
                {result.example_translation && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{result.example_translation}</p>
                )}
              </div>
            )}

            {/* Memory tip */}
            {result.memory_tip && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">💡 Tip</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{result.memory_tip}</p>
              </div>
            )}

            {/* Fallback notice */}
            {result.fallback && (
              <div className="bg-muted/60 rounded-xl px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                AI translation was unavailable — showing built-in result. The API will retry on your next search.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upgrade prompt (no API configured) ── */}
      {!aiEnabled && !loading && !result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-6 px-4 bg-card border border-dashed border-border rounded-2xl mb-6"
        >
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2 opacity-60" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Unlock AI translation</strong> by adding{" "}
            <code className="bg-muted px-1 rounded text-foreground">TRANSLATION_API_URL</code> and{" "}
            <code className="bg-muted px-1 rounded text-foreground">TRANSLATION_API_KEY</code>{" "}
            to your Railway environment variables. Compatible with LibreTranslate, DeepL, and more.
          </p>
        </motion.div>
      )}

      {/* ── History ── */}
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
            <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
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
                      onClick={() => { setFromLang(h.from); setToLang(h.to); setInputText(h.input); setResult(null); setError(null); setErrorCode(null); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-left gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{h.input}</span>
                        <span className="text-xs text-muted-foreground">{h.from} → {h.to}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-semibold text-primary truncate max-w-28">{h.translation}</span>
                        {h.source === "ai" && <Sparkles className="w-2.5 h-2.5 text-primary opacity-60" />}
                      </div>
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
