import { Target, Heart, CheckCircle, Crown } from "lucide-react";

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
 */
export function CoreIdentityWidget() {
  return (
    <div className="space-y-4">
      {/* Core Focus Header */}
      <div className="glass-card rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              Core Focus
            </span>
            <h2 className="text-lg sm:text-2xl font-bold text-foreground gradient-text truncate">
              TSM Roofing — The Authority in Roofing
            </h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Be the authority. Set the standard. Deliver roofing done right — every time.
        </p>
      </div>

      {/* Core Values Grid */}
      <div className="glass-card rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-lg font-semibold text-foreground">Core Values</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coreValues.map((value) => (
            <div
              key={value.title}
              className="p-3 sm:p-4 rounded-lg bg-card border border-border/50"
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground text-sm">{value.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{value.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
