import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/api/localApi";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import LessonCard from "../components/LessonCard";


const levels = ["All", "Beginner", "Intermediate", "Advanced"];
const types = ["All", "Vocabulary", "Grammar", "Speaking", "Listening", "Writing"];

export default function Courses() {
  const params = new URLSearchParams(window.location.search);
  const selectedLang = params.get("lang") || "English";
  const [level, setLevel] = useState("All");
  const [type, setType] = useState("All");

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons", selectedLang],
    queryFn: () => localApi.lessons(selectedLang),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      return localApi.progress();
    },
  });

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));

  const filtered = lessons.filter((l) => {
    if (level !== "All" && l.level !== level) return false;
    if (type !== "All" && l.type !== type) return false;
    return true;
  });

  const langFlags = { English: "🇬🇧", Arabic: "🇸🇦", Turkish: "🇹🇷", Somali: "🇸🇴" };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
        <Link to="/" className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{langFlags[selectedLang]} {selectedLang}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} lessons available</p>
        </div>
      </motion.div>

      {/* Level Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              level === l
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              type === t
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lessons */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <img src="https://media.base44.com/images/public/6a1c3ce55b4d9bae4528110b/6e57a3ef0_generated_image.png" alt="No lessons" className="w-40 mx-auto mb-4 rounded-2xl opacity-80" />
          <p className="text-muted-foreground text-sm">No lessons here yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {filtered.map((lesson, i) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              completed={completedIds.has(lesson.id)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
