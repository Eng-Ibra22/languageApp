import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, label, value, color = "text-primary", index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
    >
      <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </motion.div>
  );
}