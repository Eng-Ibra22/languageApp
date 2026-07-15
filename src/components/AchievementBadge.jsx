import { motion } from "framer-motion";
import { Trophy, Flame, BookOpen, Globe, Zap } from "lucide-react";

const typeIcons = {
  xp: Zap,
  streak: Flame,
  lessons: BookOpen,
  language: Globe,
  quiz: Trophy,
};

const typeColors = {
  xp: "from-amber-400 to-orange-500",
  streak: "from-red-400 to-rose-500",
  lessons: "from-blue-400 to-indigo-500",
  language: "from-emerald-400 to-teal-500",
  quiz: "from-purple-400 to-violet-500",
};

export default function AchievementBadge({ achievement, unlocked = false, index = 0 }) {
  const Icon = typeIcons[achievement.type] || Trophy;
  const gradient = typeColors[achievement.type] || typeColors.xp;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
        unlocked
          ? "bg-card border-primary/30 shadow-md"
          : "bg-muted/50 border-border opacity-60 grayscale"
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h4 className="text-xs font-bold text-foreground text-center leading-tight">{achievement.title}</h4>
      <p className="text-[10px] text-muted-foreground text-center">{achievement.description}</p>
    </motion.div>
  );
}