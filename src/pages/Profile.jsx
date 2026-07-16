import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localAuth } from "@/api/localAuth";
import { localApi } from "@/api/localApi";
import { motion } from "framer-motion";
import {
  User,
  Moon,
  Sun,
  LogOut,
  Globe,
  Bell,
  BookOpen,
  Target,
  Pencil,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const LANGUAGES = ["English", "Arabic", "Turkish", "Somali"];
const langFlags = { English: "🇬🇧", Arabic: "🇸🇦", Turkish: "🇹🇷", Somali: "🇸🇴" };
const DAILY_GOALS = [1, 2, 3, 5, 7, 10];

export default function Profile() {
  const queryClient = useQueryClient();

  // ── Profile data ──────────────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => localApi.profile(),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => localApi.progress(),
  });

  // ── Local UI state ────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.classList.contains("dark")
  );
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  // Sync dark mode from profile on load
  useEffect(() => {
    if (profile?.dark_mode !== undefined) {
      const isDark = Boolean(profile.dark_mode);
      document.documentElement.classList.toggle("dark", isDark);
      setDarkMode(isDark);
    }
  }, [profile?.dark_mode]);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data) => localApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    const next = !darkMode;
    document.documentElement.classList.toggle("dark", next);
    setDarkMode(next);
    updateMutation.mutate({ dark_mode: next });
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    updateMutation.mutate(
      { full_name: trimmed },
      { onSuccess: () => toast.success("Name updated!") }
    );
    setEditingName(false);
  };

  const handleLangSelect = (lang) => {
    updateMutation.mutate(
      { preferred_language: lang },
      { onSuccess: () => toast.success(`Learning language set to ${lang}`) }
    );
    setShowLangPicker(false);
  };

  const handleGoalSelect = (goal) => {
    updateMutation.mutate(
      { daily_goal: goal },
      { onSuccess: () => toast.success(`Daily goal set to ${goal} lesson${goal > 1 ? "s" : ""}`) }
    );
    setShowGoalPicker(false);
  };

  const handleNotificationsToggle = () => {
    const next = !profile?.notifications_enabled;
    updateMutation.mutate(
      { notifications_enabled: next },
      { onSuccess: () => toast.success(next ? "Notifications enabled" : "Notifications disabled") }
    );
  };

  const handleLogout = () => localAuth.logout("/login");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalXP = progress.reduce((s, p) => s + (p.xp_earned || 0), 0);
  const completed = progress.filter((p) => p.completed).length;
  const uniqueLangs = new Set(
    progress.filter((p) => p.completed).map((p) => p.language)
  ).size;

  // Format member since
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
      {/* ── Avatar & Name ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-xl">
          <User className="w-10 h-10 text-white" />
        </div>

        {/* Editable name */}
        {editingName ? (
          <div className="flex items-center justify-center gap-2">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              maxLength={60}
              className="text-center text-lg font-bold bg-muted border border-border rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40 w-40"
            />
            <button
              onClick={handleSaveName}
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            className="group flex items-center gap-2 mx-auto"
            onClick={() => {
              setNameInput(profile?.full_name || "");
              setEditingName(true);
            }}
          >
            <h1 className="text-xl font-bold">
              {profile?.full_name || "Learner"}
            </h1>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        <p className="text-sm text-muted-foreground">{profile?.email || ""}</p>
        {memberSince && (
          <p className="text-xs text-muted-foreground mt-1">
            Member since {memberSince}
          </p>
        )}
      </motion.div>

      {/* ── Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-5 mb-5"
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

      {/* ── Appearance Toggle ── */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        onClick={toggleDarkMode}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border mb-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          {darkMode ? (
            <Moon className="w-5 h-5 text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
          <div className="text-left">
            <div className="font-medium text-sm">Appearance</div>
            <div className="text-xs text-muted-foreground">
              {darkMode ? "Dark mode" : "Light mode"}
            </div>
          </div>
        </div>
        <div
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
            darkMode ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              darkMode ? "translate-x-5" : ""
            }`}
          />
        </div>
      </motion.button>

      {/* ── Language Preferences ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl mb-3 overflow-hidden"
      >
        <button
          onClick={() => setShowLangPicker((s) => !s)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium text-sm">Learning Language</div>
              <div className="text-xs text-muted-foreground">
                {langFlags[profile?.preferred_language]}{" "}
                {profile?.preferred_language || "English"}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              showLangPicker ? "rotate-180" : ""
            }`}
          />
        </button>

        {showLangPicker && (
          <div className="border-t border-border px-4 pb-4 pt-2 grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLangSelect(lang)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  profile?.preferred_language === lang
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-base">{langFlags[lang]}</span>
                {lang}
                {profile?.preferred_language === lang && (
                  <Check className="w-3.5 h-3.5 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Daily Goal ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card border border-border rounded-2xl mb-3 overflow-hidden"
      >
        <button
          onClick={() => setShowGoalPicker((s) => !s)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium text-sm">Daily Goal</div>
              <div className="text-xs text-muted-foreground">
                {profile?.daily_goal || 1}{" "}
                lesson{(profile?.daily_goal || 1) !== 1 ? "s" : ""} per day
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              showGoalPicker ? "rotate-180" : ""
            }`}
          />
        </button>

        {showGoalPicker && (
          <div className="border-t border-border px-4 pb-4 pt-2 flex flex-wrap gap-2">
            {DAILY_GOALS.map((g) => (
              <button
                key={g}
                onClick={() => handleGoalSelect(g)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  profile?.daily_goal === g
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {g} {g === 1 ? "lesson" : "lessons"}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Notifications ── */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleNotificationsToggle}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border mb-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <div className="font-medium text-sm">Notifications</div>
            <div className="text-xs text-muted-foreground">Daily reminders</div>
          </div>
        </div>
        <div
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
            profile?.notifications_enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              profile?.notifications_enabled ? "translate-x-5" : ""
            }`}
          />
        </div>
      </motion.button>

      {/* ── Account info ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-card border border-border rounded-2xl p-4 mb-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          <div className="font-medium text-sm">Account</div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium truncate max-w-48 text-right">
              {profile?.email}
            </span>
          </div>
          {memberSince && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">{memberSince}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total XP earned</span>
            <span className="font-bold text-primary">{totalXP} XP</span>
          </div>
        </div>
      </motion.div>

      {/* ── Sign Out ── */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={handleLogout}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">Sign Out</span>
      </motion.button>
    </div>
  );
}
