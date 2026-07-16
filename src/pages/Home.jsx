import { useQuery } from "@tanstack/react-query";
import { localAuth } from "@/api/localAuth";
import { localApi } from "@/api/localApi";
import { motion } from "framer-motion";
import { Flame, Zap, BookOpen, Target } from "lucide-react";
import LanguageCard from "../components/LanguageCard";
import StatCard from "../components/StatCard";
import ProgressRing from "../components/ProgressRing";
import { useEffect, useState } from "react";

export default function Home() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    localAuth.me().then(setUser).catch(() => {});
  }, []);

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => localApi.lessons(),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => localApi.progress(),
  });

  const totalXP = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
  const completedLessons = progress.filter((p) => p.completed).length;
  const languages = ["English", "Arabic", "Turkish", "Somali"];

  const getLangProgress = (lang) => {
    const langLessons = lessons.filter((l) => l.language === lang);
    const langCompleted = progress.filter(
      (p) => p.language === lang && p.completed
    ).length;
    if (langLessons.length === 0) return 0;
    return Math.round((langCompleted / langLessons.length) * 100);
  };

  const getLangLessonsCount = (lang) =>
    lessons.filter((l) => l.language === lang).length;

  const overallProgress =
    lessons.length > 0
      ? Math.round((completedLessons / lessons.length) * 100)
      : 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-bold text-foreground">
            {user?.full_name || "Learner"} 👋
          </h1>
        </div>
        <ProgressRing progress={overallProgress} size={52} strokeWidth={4}>
          <span className="text-[10px] font-bold">{overallProgress}%</span>
        </ProgressRing>
      </motion.div>

      {/* Hero Banner — SomSpeak branded */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden mb-6 h-44"
        style={{
          background:
            "linear-gradient(135deg, #1e3a5f 0%, #0f2040 40%, #f97316 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400/10 rounded-full translate-y-10 -translate-x-10" />
        {/* Speech bubble SVG decoration */}
        <svg
          className="absolute right-6 top-6 opacity-20"
          width="80"
          height="80"
          viewBox="0 0 100 100"
          fill="none"
        >
          <rect x="8" y="10" width="72" height="52" rx="14" fill="white" />
          <path d="M22 58 L14 74 L36 62 Z" fill="white" />
          <rect x="20" y="26" width="30" height="6" rx="3" fill="#f97316" />
          <rect x="20" y="38" width="44" height="6" rx="3" fill="#f97316" opacity="0.6" />
          <rect x="20" y="50" width="20" height="6" rx="3" fill="#f97316" opacity="0.3" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-white font-bold text-xl tracking-tight">SomSpeak</h2>
          <p className="text-white/75 text-sm mt-0.5">
            Master 4 languages, one lesson at a time
          </p>
          <div className="flex items-center gap-3 mt-3">
            {["🇬🇧", "🇸🇦", "🇹🇷", "🇸🇴"].map((flag, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-xl"
              >
                {flag}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Zap} label="Total XP" value={totalXP} index={0} />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${Math.min(completedLessons, 7)}d`}
          color="text-orange-500"
          index={1}
        />
        <StatCard
          icon={BookOpen}
          label="Lessons"
          value={completedLessons}
          color="text-accent"
          index={2}
        />
      </div>

      {/* Languages */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Your Languages</h2>
          <Target className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-3 mb-8">
          {languages.map((lang, i) => (
            <LanguageCard
              key={lang}
              language={lang}
              lessonsCount={getLangLessonsCount(lang)}
              progress={getLangProgress(lang)}
              index={i}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
