import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { localApi } from "@/api/localApi";
import { ArrowLeftRight, Search, Volume2, Copy, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Arabic", flag: "🇸🇦" },
  { code: "Turkish", flag: "🇹🇷" },
  { code: "Somali", flag: "🇸🇴" },
];

export default function Translate() {
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Arabic");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSwap = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setResult(null);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await localApi.translate(inputText, fromLang, toLang);
      setResult(res);
      setHistory((h) => [{ from: fromLang, to: toLang, input: inputText, translation: res.translation }, ...h.slice(0, 9)]);
    } catch (error) {
      toast.error(error.message || "Translation failed");
    } finally { setLoading(false); }
  };

  const speak = (text, lang) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "Arabic" ? "ar" : lang === "Turkish" ? "tr" : lang === "Somali" ? "so" : "en";
    window.speechSynthesis.speak(utter);
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Vocabulary Exchange</h1>
        <p className="text-sm text-muted-foreground mb-6">Translate between your 4 languages</p>
      </motion.div>

      {/* Language Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          {/* From */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2 font-medium">From</p>
            <div className="flex flex-col gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setFromLang(l.code); setResult(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    fromLang === l.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{l.flag}</span> {l.code}
                </button>
              ))}
            </div>
          </div>

          {/* Swap */}
          <button
            onClick={handleSwap}
            className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* To */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2 font-medium">To</p>
            <div className="flex flex-col gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setToLang(l.code); setResult(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    toLang === l.code
                      ? "bg-accent text-accent-foreground"
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-4">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleTranslate())}
          placeholder={`Type a word or phrase in ${fromLang}...`}
          rows={3}
          className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
        />
        {inputText && (
          <button onClick={() => { setInputText(""); setResult(null); }} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      <Button
        onClick={handleTranslate}
        disabled={!inputText.trim() || loading || fromLang === toLang}
        className="w-full rounded-xl h-12 text-base font-semibold mb-6"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
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
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Translation</p>
                <p className="text-2xl font-bold text-foreground">{result.translation}</p>
                {result.pronunciation && (
                  <p className="text-sm text-muted-foreground mt-1">/{result.pronunciation}/</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => speak(result.translation, toLang)} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
                <button onClick={() => copy(result.translation)} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Example */}
            {result.example_sentence && (
              <div className="bg-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Example sentence</p>
                <p className="text-sm font-medium">{result.example_sentence}</p>
                {result.example_translation && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{result.example_translation}</p>
                )}
              </div>
            )}

            {/* Memory tip */}
            {result.memory_tip && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">💡 Memory tip</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{result.memory_tip}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-sm font-bold mb-3 text-muted-foreground">Recent</h3>
          <div className="space-y-2 mb-8">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setFromLang(h.from); setToLang(h.to); setInputText(h.input); setResult(null); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-left"
              >
                <span className="text-sm font-medium truncate">{h.input}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">{h.from} → {h.to}</span>
                  <span className="text-sm font-semibold text-primary truncate max-w-20">{h.translation}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
