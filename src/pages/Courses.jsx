import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/api/localApi";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import LessonCard from "../components/LessonCard";

const TIERS = [
  {
    label: "All",
    color: "bg-primary text-primary-foreground",
    inactive: "bg-card border border-border text-muted-foreground hover:text-foreground",
    badge: null,
  },
  {
    label: "Beginner",
    color: "bg-emerald-500 text-white",
    inactive: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40",
    badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    label: "Intermediate",
    color: "bg-blue-500 text-white",
    inactive: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40",
    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  {
    label: "Advanced",
    color: "bg-purple-500 text-white",
    inactive: "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40",
    badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
  },
];

const TYPES = ["All", "Vocabulary", "Grammar", "Speaking", "Listening", "Writing"];

const langFlags = { English: "🇬🇧", Arabic: "🇸🇦", Turkish: "🇹🇷", Somali: "🇸🇴" };

function TierSection({ tier, lessons, completedIds }) {
  const tierConfig = TIERS.find((t) => t.label === tier);
  const completed = lessons.filter((l) => completedIds.has(l.id)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      {/* Tier header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${tierConfig?.dot}`} />
          <h3 className="font-bold text-sm text-foreground">{tier}</h3>
          <span className="text-xs text-muted-foreground">
            ({lessons.length} lessons)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-muted-foreground font-medium">
            {completed}/{lessons.length}
          </span>
        </div>
      </div>

      {/* Progress bar for this tier */}
      {lessons.length > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            className={`h-full rounded-full ${tierConfig?.dot}`}
            initial={{ width: 0 }}
            animate={{ width: `${(completed / lessons.length) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}

      <div className="space-y-2">
        {lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            completed={completedIds.has(lesson.id)}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function Courses() {
  const params = new URLSearchParams(window.location.search);
  const selectedLang = params.get("lang") || "English";
  const [activeLevel, setActiveLevel] = useState("All");
  const [activeType, setActiveType] = useState("All");

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons", selectedLang],
    queryFn: () => localApi.lessons(selectedLang),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => localApi.progress(),
  });

  const completedIds = new Set(
    progress.filter((p) => p.completed).map((p) => p.lesson_id)
  );

  const filtered = lessons.filter((l) => {
    if (activeType !== "All" && l.type !== activeType) return false;
    return true;
  });

  // Group lessons by tier for the "All" view or show filtered list
  const beginnerLessons = filtered.filter((l) => l.level === "Beginner");
  const intermediateLessons = filtered.filter((l) => l.level === "Intermediate");
  const advancedLessons = filtered.filter((l) => l.level === "Advanced");

  const activeTierLessons =
    activeLevel === "All"
      ? filtered
      : filtered.filter((l) => l.level === activeLevel);

  const totalCompleted = completedIds.size;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <Link
          to="/"
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {langFlags[selectedLang]} {selectedLang}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lessons.length} lessons · {totalCompleted} completed
          </p>
        </div>
      </motion.div>

      {/* Difficulty Tier Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {TIERS.map((tier) => {
          const isActive = activeLevel === tier.label;
          const count =
            tier.label === "All"
              ? lessons.length
              : lessons.filter((l) => l.level === tier.label).length;
          return (
            <button
              key={tier.label}
              onClick={() => setActiveLevel(tier.label)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
                isActive ? tier.color : tier.inactive
              }`}
            >
              {tier.label !== "All" && tier.dot && !isActive && (
                <span className={`w-2 h-2 rounded-full ${tier.dot} shrink-0`} />
              )}
              {tier.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeType === t
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lesson Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : activeTierLessons.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center text-3xl">
            📚
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            No lessons match this filter.
          </p>
          <button
            onClick={() => {
              setActiveLevel("All");
              setActiveType("All");
            }}
            className="text-primary text-sm mt-2 hover:underline"
          >
            Clear filters
          </button>
        </motion.div>
      ) : activeLevel === "All" ? (
        // Grouped by tier view
        <AnimatePresence mode="wait">
          <motion.div
            key="grouped"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {beginnerLessons.length > 0 && (
              <TierSection
                tier="Beginner"
                lessons={beginnerLessons}
                completedIds={completedIds}
              />
            )}
            {intermediateLessons.length > 0 && (
              <TierSection
                tier="Intermediate"
                lessons={intermediateLessons}
                completedIds={completedIds}
              />
            )}
            {advancedLessons.length > 0 && (
              <TierSection
                tier="Advanced"
                lessons={advancedLessons}
                completedIds={completedIds}
              />
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        // Single tier view
        <AnimatePresence mode="wait">
          <motion.div
            key={activeLevel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 mb-8"
          >
            {activeTierLessons.map((lesson, i) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                completed={completedIds.has(lesson.id)}
                index={i}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
      <div className="h-4" />
    </div>
  );
}
