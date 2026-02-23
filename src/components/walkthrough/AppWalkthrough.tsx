import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { WALKTHROUGH_STEPS, WalkthroughStep } from "./walkthroughSteps";
import { NEON_GREEN } from "@/hooks/useWalkthrough";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface AppWalkthroughProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function AppWalkthrough({ isActive, onComplete, onSkip }: AppWalkthroughProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<"top" | "bottom">("bottom");
  const rafRef = useRef<number>();
  const scrolledRef = useRef(false);

  const step = WALKTHROUGH_STEPS[currentStep] as WalkthroughStep | undefined;
  const isFinal = step?.isFinal ?? false;

  const findTarget = useCallback((target: string | null): HTMLElement | null => {
    if (!target) return null;
    return document.querySelector(`[data-tutorial="${target}"]`);
  }, []);

  // Navigate when step changes
  useEffect(() => {
    if (!isActive || !step) return;
    const targetRoute = step.route;
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  }, [isActive, currentStep, step?.route, location.pathname, navigate]);

  // Scroll to target when step changes
  useEffect(() => {
    if (!isActive || !step?.target) return;
    scrolledRef.current = false;
    const el = findTarget(step.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      const timer = setTimeout(() => {
        scrolledRef.current = true;
      }, 450);
      return () => clearTimeout(timer);
    } else {
      scrolledRef.current = true;
    }
  }, [isActive, currentStep, step?.target, findTarget]);

  // Position tracking via RAF
  useEffect(() => {
    if (!isActive) return;
    const target = step?.target ?? null;

    const update = () => {
      const el = findTarget(target);
      if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 6;
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
        const spaceBelow = window.innerHeight - rect.bottom;
        setTooltipPos(spaceBelow > 220 ? "bottom" : "top");
      } else {
        setTargetRect(null);
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, currentStep, step?.target, findTarget]);

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      if (isFinal) {
        triggerConfetti();
        onComplete();
      }
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    onSkip();
    setCurrentStep(0);
  };

  const handleClose = () => {
    if (isFinal) {
      triggerConfetti();
      onComplete();
    } else {
      onSkip();
    }
    setCurrentStep(0);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors: [NEON_GREEN, "#39FF14", "#FFFFFF", "#000000", "#22C55E"],
    });
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: [NEON_GREEN, "#FFFFFF"],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: [NEON_GREEN, "#FFFFFF"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  if (!isActive || !step) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ isolation: "isolate" }}
    >
      {/* Dark overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="walkthrough-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && !isFinal && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#walkthrough-mask)"
        />
      </svg>

      {/* Neon green spotlight border */}
      {targetRect && !isFinal && (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: `0 0 0 2px ${NEON_GREEN}, 0 0 20px ${NEON_GREEN}40`,
          }}
        />
      )}

      {/* Tooltip — pointer-events: auto */}
      <div
        className={cn(
          "fixed bg-black border-2 rounded-2xl p-5 shadow-2xl max-w-[360px] pointer-events-auto",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        style={{
          borderColor: NEON_GREEN,
          ...(targetRect && !isFinal
            ? tooltipPos === "bottom"
              ? {
                  top: targetRect.top + targetRect.height + 16,
                  left: Math.min(
                    Math.max(targetRect.left, 16),
                    window.innerWidth - 376
                  ),
                }
              : {
                  top: targetRect.top - 12,
                  left: Math.min(
                    Math.max(targetRect.left, 16),
                    window.innerWidth - 376
                  ),
                  transform: "translateY(-100%)",
                }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }),
          zIndex: 10000,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: NEON_GREEN }}
          >
            Step {currentStep + 1} of {WALKTHROUGH_STEPS.length}
          </span>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white p-1 -mr-1 -mt-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-white text-[15px] leading-relaxed mb-5">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {WALKTHROUGH_STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === currentStep ? 16 : 6,
                backgroundColor: i === currentStep ? NEON_GREEN : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleSkip}
            className="text-xs text-white/60 hover:text-white/90 underline transition-colors"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className="font-semibold"
              style={{
                backgroundColor: NEON_GREEN,
                color: "#000",
              }}
            >
              {isFinal ? "Close" : "Next"}
              {!isFinal && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
