import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Headphones, Mic, PenTool, Type, CheckCircle2, Clock, Zap } from "lucide-react";

const typeIcons = {
  Vocabulary: Type,
  Grammar: BookOpen,
  Speaking: Mic,
  Listening: Headphones,
  Writing: PenTool,
};

const typeColors = {
  Vocabulary: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  Grammar: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  Speaking: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  Listening: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  Writing: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
};

const levelBadge = {
  Beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const levelDot = {
  Beginner: "bg-emerald-500",
  Intermediate: "bg-blue-500",
  Advanced: "bg-purple-500",
};

export default function LessonCard({ lesson, completed = false, locked = false, index = 0 }) {
  const Icon = typeIcons[lesson.type] || BookOpen;
  const colorClass = typeColors[lesson.type] || typeColors.Vocabulary;
  const badgeClass = levelBadge[lesson.level] || levelBadge.Beginner;
  const dotClass = levelDot[lesson.level] || levelDot.Beginner;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Link
        to={locked ? "#" : `/lesson/${lesson.id}`}
        className={`block ${locked ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div
          className={`flex items-center gap-4 p-4 rounded-2xl bg-card border transition-all group
            ${completed
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
              : "border-border hover:border-primary/30 hover:shadow-md"
            }`}
        >
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
          >
            {completed ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate leading-snug">
              {lesson.title}
            </h4>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {/* Difficulty dot + label */}
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                {lesson.level}
              </span>
              {/* Type badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                {lesson.type}
              </span>
              {/* Duration */}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lesson.duration_minutes || 10}m
              </span>
            </div>
          </div>

          {/* XP reward */}
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 justify-end">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">
                {lesson.xp_reward}
              </span>
            </div>
            {completed && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Done ✓
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}