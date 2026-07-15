import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const languageConfig = {
  English: { flag: "🇬🇧", gradient: "from-blue-500 to-indigo-600", desc: "Global Communication" },
  Arabic: { flag: "🇸🇦", gradient: "from-emerald-500 to-teal-600", desc: "Rich & Elegant" },
  Turkish: { flag: "🇹🇷", gradient: "from-red-400 to-rose-600", desc: "Bridge of Cultures" },
  Somali: { flag: "🇸🇴", gradient: "from-sky-400 to-blue-600", desc: "Horn of Africa" },
};

export default function LanguageCard({ language, lessonsCount = 0, progress = 0, index = 0 }) {
  const config = languageConfig[language] || languageConfig.English;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link to={`/courses?lang=${language}`}>
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-5 text-white shadow-lg hover:shadow-xl transition-shadow group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{config.flag}</span>
              <div>
                <h3 className="font-bold text-lg">{language}</h3>
                <p className="text-white/80 text-sm">{config.desc}</p>
                <p className="text-white/60 text-xs mt-1">{lessonsCount} lessons</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
          {progress > 0 && (
            <div className="mt-4 relative z-10">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}