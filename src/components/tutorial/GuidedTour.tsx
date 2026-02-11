import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { HelpCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTutorial } from "@/hooks/useTutorial";
import { TutorialStep } from "./tutorialSteps";
import { useIsMobile } from "@/hooks/use-mobile";

interface GuidedTourProps {
  pageName: string;
  pageTitle: string;
  steps: TutorialStep[];
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour({ pageName, pageTitle, steps }: GuidedTourProps) {
  const {
    isActive,
    showWelcome,
    startTour,
    dismissWelcome,
    completeTour,
    restartTour,
  } = useTutorial(pageName);

  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const isMobile = useIsMobile();
  const rafRef = useRef<number>();

  const findTarget = useCallback(
    (stepIndex: number): HTMLElement | null => {
      if (stepIndex < 0 || stepIndex >= steps.length) return null;
      return document.querySelector(`[data-tutorial="${steps[stepIndex].target}"]`);
    },
    [steps]
  );

  // Position tracking
  useEffect(() => {
    if (!isActive) return;

    const update = () => {
      const el = findTarget(currentStep);
      if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 6;
        setTargetRect({
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Determine tooltip position
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (isMobile) {
          setTooltipPos("bottom"); // mobile uses bottom sheet
        } else if (spaceBelow > 200) {
          setTooltipPos("bottom");
        } else if (spaceAbove > 200) {
          setTooltipPos("top");
        } else {
          setTooltipPos("bottom");
        }

        // Scroll into view if needed
        if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        setTargetRect(null);
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, currentStep, findTarget, isMobile]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    completeTour();
    setCurrentStep(0);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    restartTour();
  };

  const step = steps[currentStep];

  // Touch swipe for mobile
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) handleNext();
      else handlePrev();
    }
  };

  return (
    <>
      {/* Welcome Prompt */}
      {showWelcome &&
        createPortal(
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 animate-in fade-in-0 duration-300">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-base font-bold text-foreground mb-2">
                Welcome to {pageTitle}!
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                Would you like a quick tour of the features on this page?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={startTour}
                  size="sm"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                >
                  Start Tour
                </Button>
                <Button
                  onClick={dismissWelcome}
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-muted-foreground"
                >
                  No thanks
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Active Tour Overlay */}
      {isActive &&
        step &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Dim overlay with cutout */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ height: document.documentElement.scrollHeight }}
            >
              <defs>
                <mask id="tutorial-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {targetRect && (
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
                fill="rgba(0,0,0,0.4)"
                mask="url(#tutorial-mask)"
              />
            </svg>

            {/* Spotlight border */}
            {targetRect && (
              <div
                className="absolute rounded-xl ring-2 ring-primary/60 pointer-events-none transition-all duration-300 ease-out"
                style={{
                  top: targetRect.top,
                  left: targetRect.left,
                  width: targetRect.width,
                  height: targetRect.height,
                }}
              />
            )}

            {/* Tooltip */}
            {isMobile ? (
              // Mobile bottom sheet
              <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Step {currentStep + 1} of {steps.length}
                    </p>
                    <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                  {step.description}
                </p>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSkip}
                    className="text-[12px] text-muted-foreground underline"
                  >
                    Skip Tutorial
                  </button>
                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <Button variant="outline" size="sm" onClick={handlePrev} className="text-xs h-8">
                        <ChevronLeft className="h-3 w-3 mr-1" />
                        Back
                      </Button>
                    )}
                    <Button size="sm" onClick={handleNext} className="text-xs h-8 bg-primary text-primary-foreground">
                      {currentStep === steps.length - 1 ? "Done" : "Next"}
                      {currentStep < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Desktop floating tooltip
              targetRect && (
                <div
                  className={cn(
                    "absolute bg-card border border-border rounded-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-w-[320px] animate-in fade-in-0 zoom-in-95 duration-200 pointer-events-auto",
                  )}
                  style={{
                    ...(tooltipPos === "bottom"
                      ? {
                          top: targetRect.top + targetRect.height + 12,
                          left: Math.min(
                            Math.max(targetRect.left, 16),
                            window.innerWidth - 340
                          ),
                        }
                      : {
                          top: targetRect.top - 12,
                          left: Math.min(
                            Math.max(targetRect.left, 16),
                            window.innerWidth - 340
                          ),
                          transform: "translateY(-100%)",
                        }),
                  }}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      Step {currentStep + 1} of {steps.length}
                    </p>
                    <button
                      onClick={handleSkip}
                      className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <h4 className="text-[14px] font-bold text-foreground mb-1">{step.title}</h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
                    {step.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleSkip}
                      className="text-[12px] text-muted-foreground underline hover:text-foreground"
                    >
                      Skip Tutorial
                    </button>
                    <div className="flex gap-2">
                      {currentStep > 0 && (
                        <Button variant="outline" size="sm" onClick={handlePrev} className="text-xs h-7 px-2">
                          Back
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleNext}
                        className="text-xs h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {currentStep === steps.length - 1 ? "Done" : "Next"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Click overlay to prevent interaction (except tooltip) */}
            <div
              className="absolute inset-0"
              onClick={(e) => {
                // Allow clicking inside the tooltip
                const tooltip = (e.target as HTMLElement).closest("[data-tutorial-tooltip]");
                if (!tooltip) e.stopPropagation();
              }}
              style={{ zIndex: -1 }}
            />
          </div>,
          document.body
        )}

      {/* Floating Help Button */}
      {!isActive && !showWelcome && (
        <button
          onClick={handleRestart}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-muted/80 hover:bg-muted border border-border/50 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-105 text-muted-foreground hover:text-foreground"
          title="Page Tutorial"
        >
          <HelpCircle className="h-4.5 w-4.5" />
        </button>
      )}
    </>
  );
}
