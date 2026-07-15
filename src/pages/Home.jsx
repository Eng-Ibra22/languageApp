import { useQuery } from "@tanstack/react-query";
import { localAuth } from "@/api/localAuth";
import { localApi } from "@/api/localApi";
import { motion } from "framer-motion";
import { Flame, Zap, BookOpen, Target } from "lucide-react";
import LanguageCard from "../components/LanguageCard";
import StatCard from "../components/StatCard";
import ProgressRing from "../components/ProgressRing";
import { useEffect, useState } from "react";

const HERO_IMG = "https://media.base44.com/images/public/6a1c3ce55b4d9bae4528110b/76ad42844_generated_image.png";

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
    queryFn: async () => {
      return localApi.progress();
    },
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
        <ProgressRing progress={lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0} size={52} strokeWidth={4}>
          <span className="text-[10px] font-bold">{lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0}%</span>
        </ProgressRing>
      </motion.div>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden mb-6 h-44"
      >
        <img src={HERO_IMG} alt="Learning" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-white font-bold text-lg">Lingua4</h2>
          <p className="text-white/80 text-sm">Master 4 languages, one lesson at a time</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Zap} label="Total XP" value={totalXP} index={0} />
        <StatCard icon={Flame} label="Streak" value={`${Math.min(completedLessons, 7)}d`} color="text-orange-500" index={1} />
        <StatCard icon={BookOpen} label="Lessons" value={completedLessons} color="text-accent" index={2} />
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
