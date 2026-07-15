import { useQuery } from "@tanstack/react-query";
import { localAuth } from "@/api/localAuth";
import { localApi } from "@/api/localApi";
import { motion } from "framer-motion";
import { User, Moon, Sun, LogOut, ChevronRight, Globe, Bell, Shield, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";


export default function Profile() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    localAuth.me().then(setUser).catch(() => {});
  }, []);

  const { data: progress = [] } = useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      return localApi.progress();
    },
  });

  const totalXP = progress.reduce((s, p) => s + (p.xp_earned || 0), 0);
  const completed = progress.filter((p) => p.completed).length;
  const uniqueLangs = new Set(progress.filter((p) => p.completed).map((p) => p.language)).size;

  const toggleDarkMode = () => {
    const next = !darkMode;
    document.documentElement.classList.toggle("dark", next);
    setDarkMode(next);
    localApi.updateProfile({ dark_mode: next }).catch(() => {});
  };

  const handleLogout = () => {
    localAuth.logout("/login");
  };

  const menuItems = [
    { icon: Globe, label: "Language Preferences", desc: "4 languages available" },
    { icon: Bell, label: "Notifications", desc: "Daily reminders" },
    { icon: Shield, label: "Privacy & Security", desc: "Manage your data" },
    { icon: BookOpen, label: "Learning Goals", desc: "Set your targets" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-xl">
          <User className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-xl font-bold">{user?.full_name || "Learner"}</h1>
        <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-5 mb-6"
      >
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalXP}</div>
            <div className="text-xs text-muted-foreground">Total XP</div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{completed}</div>
            <div className="text-xs text-muted-foreground">Lessons</div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">{uniqueLangs}</div>
            <div className="text-xs text-muted-foreground">Languages</div>
          </div>
        </div>
      </motion.div>

      {/* Theme Toggle */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        onClick={toggleDarkMode}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border mb-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-amber-500" />}
          <div className="text-left">
            <div className="font-medium text-sm">Appearance</div>
            <div className="text-xs text-muted-foreground">{darkMode ? "Dark mode" : "Light mode"}</div>
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-5" : ""}`} />
        </div>
      </motion.button>

      {/* Menu Items */}
      <div className="space-y-2 mb-6">
        {menuItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        ))}
      </div>

      {/* Logout */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={handleLogout}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors mb-8"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">Sign Out</span>
      </motion.button>
    </div>
  );
}
