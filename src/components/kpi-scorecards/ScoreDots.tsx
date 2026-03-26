import { useState, useCallback } from "react";
import { SCORE_COLORS } from "@/lib/kpiTypes";

interface ScoreDotsProps {
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
  disabled?: boolean;
}

export function ScoreDots({
  value,
  onChange,
  max = 5,
  disabled = false,
}: ScoreDotsProps) {
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  const [pressing, setPressing] = useState<number | null>(null);

  const activeValue = hoveredDot ?? value;

  const handleClick = useCallback(
    (score: number) => {
      if (disabled) return;
      onChange(value === score ? null : score);
    },
    [disabled, onChange, value]
  );

  return (
    <div className="flex items-center gap-2.5">
      {Array.from({ length: max }, (_, i) => {
        const score = i + 1;
        const isFilled = activeValue !== null && score <= activeValue;
        const color = isFilled
          ? SCORE_COLORS[activeValue!] ?? SCORE_COLORS[5]
          : undefined;
        const isPressed = pressing === score;

        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            className="relative flex items-center justify-center rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              width: 40,
              height: 40,
              minWidth: 36,
              backgroundColor: isFilled ? color : "transparent",
              border: isFilled
                ? `2px solid ${color}`
                : "2px solid hsl(var(--border))",
              transform: isPressed ? "scale(1.15)" : "scale(1)",
              boxShadow: isFilled
                ? `0 0 8px ${color}40`
                : "none",
            }}
            onPointerDown={() => !disabled && setPressing(score)}
            onPointerUp={() => setPressing(null)}
            onPointerLeave={() => {
              setPressing(null);
              setHoveredDot(null);
            }}
            onPointerEnter={() => !disabled && setHoveredDot(score)}
            onClick={() => handleClick(score)}
            aria-label={`Score ${score}`}
          >
            <span
              className="text-sm font-semibold select-none"
              style={{
                color: isFilled ? "#fff" : "hsl(var(--muted-foreground))",
              }}
            >
              {score}
            </span>
          </button>
        );
      })}
    </div>
  );
}
