import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localAuth } from "@/api/localAuth";
import { localApi } from "@/api/localApi";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";

export default function LessonDetail() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    localAuth.me().then(setUser).catch(() => {});
  }, []);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => localApi.lesson(lessonId),
  });

  const saveProgress = useMutation({
    mutationFn: ({ lessonId: id, score: value }) => localApi.completeLesson(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-progress"] }),
  });

  const quizData = lesson?.quiz_data ? (() => { try { return JSON.parse(lesson.quiz_data); } catch { return []; } })() : [];
  const contentData = lesson?.content ? (() => { try { return JSON.parse(lesson.content); } catch { return null; } })() : null;

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    const isCorrect = answer === quizData[currentQ]?.correct;
    if (isCorrect) setScore((s) => s + 1);

    setTimeout(() => {
      if (currentQ < quizData.length - 1) {
        setCurrentQ((c) => c + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizFinished(true);
        const finalScore = isCorrect ? score + 1 : score;
        const xpEarned = Math.round((finalScore / quizData.length) * (lesson?.xp_reward || 20));
        if (user) {
          saveProgress.mutate({ lessonId, score: Math.round((finalScore / quizData.length) * 100) });
        }
        if (finalScore >= quizData.length * 0.7) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <p className="text-muted-foreground">Lesson not found</p>
        <Link to="/" className="text-primary text-sm mt-2 inline-block">Go home</Link>
      </div>
    );
  }

  if (quizFinished) {
    const finalScore = Math.round((score / quizData.length) * 100);
    const xpEarned = Math.round((score / quizData.length) * (lesson.xp_reward || 20));
    return (
      <div className="max-w-lg mx-auto px-4 pt-12">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-xl">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {finalScore >= 70 ? "Amazing work!" : "Good effort!"}
          </h2>
          <p className="text-muted-foreground mb-6">
            You scored {score}/{quizData.length} ({finalScore}%)
          </p>
          <div className="flex justify-center gap-6 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">+{xpEarned}</div>
              <div className="text-xs text-muted-foreground">XP earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{finalScore}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
          <div className="space-y-3">
            <Button onClick={() => navigate(`/courses?lang=${lesson.language}`)} className="w-full rounded-xl h-12">
              Continue Learning
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full rounded-xl h-12">
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (quizStarted && quizData.length > 0) {
    const q = quizData[currentQ];
    return (
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setQuizStarted(false)} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 mx-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${((currentQ + 1) / quizData.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{currentQ + 1}/{quizData.length}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <h3 className="text-lg font-bold mb-6">{q.question}</h3>
            <div className="space-y-3">
              {q.options?.map((opt, i) => {
                let optClass = "bg-card border border-border hover:border-primary/50";
                if (showResult) {
                  if (opt === q.correct) optClass = "bg-accent/10 border-accent text-accent";
                  else if (opt === selectedAnswer) optClass = "bg-destructive/10 border-destructive text-destructive";
                }
                return (
                  <button
                    key={i}
                    onClick={() => !showResult && handleAnswer(opt)}
                    disabled={showResult}
                    className={`w-full text-left p-4 rounded-xl font-medium transition-all ${optClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/courses?lang=${lesson.language}`} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{lesson.title}</h1>
          <p className="text-xs text-muted-foreground">{lesson.level} • {lesson.type}</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-bold">{lesson.xp_reward} XP</span>
        </div>
      </div>

      {lesson.description && (
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{lesson.description}</p>
      )}

      {contentData && (
        <div className="space-y-4 mb-8">
          {contentData.sections?.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <h3 className="font-bold text-sm mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
              {section.examples && (
                <div className="mt-3 space-y-2">
                  {section.examples.map((ex, j) => (
                    <div key={j} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{ex}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {quizData.length > 0 && (
        <Button onClick={() => setQuizStarted(true)} className="w-full rounded-xl h-12 mb-8 text-base font-semibold">
          Start Quiz <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      )}
    </div>
  );
}
