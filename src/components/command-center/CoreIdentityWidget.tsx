import { useState } from "react";
import { Heart, CheckCircle, Crown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const coreValues = [
  {
    title: "Genuinely Authentic",
    description: "We are real, honest, and transparent in all our interactions.",
  },
  {
    title: "Do the Right Thing",
    description: "Integrity guides every decision we make, even when no one is watching.",
  },
  {
    title: "Never Stop Building",
    description: "We continuously improve ourselves, our processes, and our company.",
  },
  {
    title: "Reliable Reputation",
    description: "We deliver on our promises and build trust through consistent excellence.",
  },
];

/**
 * Locked Core Identity Widget - Cannot be removed, reordered, or edited.
 * Always displayed at top of Command Center.
 * Mobile: Touch to reveal descriptions, condensed layout
 * Desktop: Full layout with all descriptions visible
 */
export function CoreIdentityWidget() {
  const [expandedValue, setExpandedValue] = useState<string | null>(null);

  const toggleValue = (title: string) => {
    setExpandedValue(expandedValue === title ? null : title);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Core Focus Header - Mobile Optimized */}
      <div className="glass-card rounded-xl p-4 sm:p-6">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              TSM Roofing Core Focus
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            The Authority in Roofing
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Be the authority. Set the standard. Deliver roofing done right — every time.
          </p>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:block">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Core Focus
              </span>
              <h2 className="text-2xl font-bold text-foreground gradient-text">
                TSM Roofing — The Authority in Roofing
              </h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Be the authority. Set the standard. Deliver roofing done right — every time.
          </p>
        </div>
      </div>

      {/* Core Values - Mobile: Touch to Expand, Desktop: Full Grid */}
      <div className="glass-card rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Heart className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Core Values</h3>
        </div>

        {/* Mobile: Accordion Style */}
        <div className="sm:hidden space-y-2">
          {coreValues.map((value) => {
            const isExpanded = expandedValue === value.title;
            return (
              <button
                key={value.title}
                onClick={() => toggleValue(value.title)}
                className={cn(
                  "w-full p-3 rounded-lg bg-card border border-border/50 text-left transition-all duration-200",
                  isExpanded && "bg-primary/5 border-primary/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-primary" />
                    </div>
                    <h4 className="font-medium text-foreground text-sm truncate">{value.title}</h4>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                      isExpanded && "rotate-180"
                    )} 
                  />
                </div>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isExpanded ? "max-h-24 mt-2 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <p className="text-xs text-muted-foreground pl-8 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop: 2x2 Grid with Full Descriptions */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-3">
          {coreValues.map((value) => (
            <div
              key={value.title}
              className="p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground text-sm">{value.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 break-words leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
