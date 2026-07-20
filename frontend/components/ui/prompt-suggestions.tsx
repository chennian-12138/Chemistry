"use client";

import { motion } from "framer-motion";

interface PromptSuggestionsProps {
  label: string;
  append: (message: { role: "user"; content: string }) => void;
  suggestions: string[];
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
}: PromptSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      {suggestions.map((suggestion, i) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 + i * 0.06 }}
          onClick={() => append({ role: "user", content: suggestion })}
          className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors"
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}
