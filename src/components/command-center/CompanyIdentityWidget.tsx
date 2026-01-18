import { Target, Heart, CheckCircle } from "lucide-react";

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

export function CompanyIdentityWidget() {
  return (
    <div className="space-y-6">
      {/* Core Focus */}
      <div className="glass-card rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs font-medium text-primary uppercase tracking-wider">
          Core Focus
        </span>
        <h2 className="text-2xl font-bold text-foreground mt-1 gradient-text">
          Simplify Roofing
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          We make roofing simple for homeowners and contractors alike. From the first 
          inspection to the final walkthrough, we streamline every step.
        </p>
      </div>

      {/* Core Values */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Core Values</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {coreValues.map((value) => (
            <div
              key={value.title}
              className="p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">{value.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{value.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
