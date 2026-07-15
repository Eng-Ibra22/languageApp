import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/api/localApi";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import { format, subDays, parseISO, isValid } from "date-fns";
import ProgressRing from "../components/ProgressRing";
import { Zap, BookOpen, Target } from "lucide-react";
import StatCard from "../components/StatCard";

const COLORS = ["hsl(239,84%,67%)", "hsl(152,69%,42%)", "hsl(0,84%,60%)", "hsl(200,80%,50%)"];
const langLabels = { English: "🇬🇧 EN", Arabic: "🇸🇦 AR", Turkish: "🇹🇷 TR", Somali: "🇸🇴 SO" };

export default function Progress() {
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

  const totalXP = progress.reduce((s, p) => s + (p.xp_earned || 0), 0);
  const completed = progress.filter((p) => p.completed);
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((s, p) => s + (p.score || 0), 0) / completed.length) : 0;

  const languages = ["English", "Arabic", "Turkish", "Somali"];
  const langData = languages.map((lang) => {
    const langLessons = lessons.filter((l) => l.language === lang).length;
    const langCompleted = progress.filter((p) => p.language === lang && p.completed).length;
    return {
      name: langLabels[lang],
      completed: langCompleted,
      total: langLessons,
      pct: langLessons > 0 ? Math.round((langCompleted / langLessons) * 100) : 0,
    };
  });

  const pieData = languages.map((lang) => ({
    name: lang,
    value: progress.filter((p) => p.language === lang && p.completed).length || 0,
  })).filter((d) => d.value > 0);

  // Build last-30-days XP chart data
  const today = new Date();
  const xpByDay = {};
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(today, i), "MMM d");
    xpByDay[d] = 0;
  }
  progress.forEach((p) => {
    if (p.completed_date) {
      const parsed = parseISO(p.completed_date);
      if (isValid(parsed)) {
        const label = format(parsed, "MMM d");
        if (label in xpByDay) xpByDay[label] += p.xp_earned || 0;
      }
    }
  });
  const xpChartData = Object.entries(xpByDay).map(([date, xp]) => ({ date, xp }));
  // Compute cumulative XP
  let running = 0;
  const cumulativeData = xpChartData.map(({ date, xp }) => { running += xp; return { date, xp, cumulative: running }; });

  const typeData = ["Vocabulary", "Grammar", "Speaking", "Listening", "Writing"].map((type) => ({
    name: type.slice(0, 5),
    count: progress.filter((p) => {
      const lesson = lessons.find((l) => l.id === p.lesson_id);
      return lesson?.type === type && p.completed;
    }).length,
  }));

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Your Progress</h1>
        <p className="text-sm text-muted-foreground mb-6">Track your learning journey</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Zap} label="Total XP" value={totalXP} index={0} />
        <StatCard icon={BookOpen} label="Completed" value={completed.length} color="text-accent" index={1} />
        <StatCard icon={Target} label="Avg Score" value={`${avgScore}%`} color="text-purple-500" index={2} />
      </div>

      {/* Language Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-4">Language Progress</h3>
        <div className="flex justify-around">
          {langData.map((d, i) => (
            <div key={d.name} className="flex flex-col items-center gap-2">
              <ProgressRing progress={d.pct} size={56} strokeWidth={4}>
                <span className="text-[9px] font-bold">{d.pct}%</span>
              </ProgressRing>
              <span className="text-xs font-medium">{d.name}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* XP Growth Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-sm">XP Growth — Last 30 Days</h3>
          <span className="text-xs font-bold text-primary">+{totalXP} total XP</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Cumulative XP earned over time</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={cumulativeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(239,84%,67%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(239,84%,67%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
              formatter={(v) => [`${v} XP`, "Cumulative XP"]}
            />
            <Area type="monotone" dataKey="cumulative" stroke="hsl(239,84%,67%)" strokeWidth={2} fill="url(#xpGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-4">Skills Breakdown</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={typeData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-2xl p-5 mb-8">
          <h3 className="font-bold text-sm mb-4">Learning Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={4}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
