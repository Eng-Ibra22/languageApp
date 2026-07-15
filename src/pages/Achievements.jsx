import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/api/localApi";
import { motion } from "framer-motion";
import AchievementBadge from "../components/AchievementBadge";
import { Trophy } from "lucide-react";

const ACHIEVEMENT_IMG = "https://media.base44.com/images/public/6a1c3ce55b4d9bae4528110b/4f27919c6_generated_image.png";

export default function Achievements() {
  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => localApi.achievements(),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      return localApi.progress();
    },
  });

  const totalXP = progress.reduce((s, p) => s + (p.xp_earned || 0), 0);
  const completedLessons = progress.filter((p) => p.completed).length;
  const uniqueLangs = new Set(progress.filter((p) => p.completed).map((p) => p.language)).size;

  const isUnlocked = (ach) => {
    switch (ach.type) {
      case "xp": return totalXP >= ach.requirement_value;
      case "lessons": return completedLessons >= ach.requirement_value;
      case "language": return uniqueLangs >= ach.requirement_value;
      default: return false;
    }
  };

  const unlockedCount = achievements.filter(isUnlocked).length;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Achievements</h1>
        <p className="text-sm text-muted-foreground mb-6">{unlockedCount} of {achievements.length} unlocked</p>
      </motion.div>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-3xl overflow-hidden mb-6 h-36"
      >
        <img src={ACHIEVEMENT_IMG} alt="Achievements" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Keep going!</h2>
            <p className="text-white/70 text-sm">Every lesson unlocks new badges</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {achievements.map((ach, i) => (
            <AchievementBadge key={ach.id} achievement={ach} unlocked={isUnlocked(ach)} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
