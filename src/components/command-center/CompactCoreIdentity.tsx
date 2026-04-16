import { Crown, Heart, CheckCircle } from "lucide-react";

const coreValues = [
  "Genuinely Authentic",
  "Do the Right Thing",
  "Never Stop Building",
  "Reliable Reputation",
];

export function CompactCoreIdentity() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            Core Focus
          </span>
        </div>
        <h3 className="text-base font-extrabold text-foreground leading-tight mb-1">
          The Authority in Roofing
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Be the authority. Set the standard. Deliver roofing done right — every time.
        </p>
      </div>

      <div className="md:col-span-2 bg-card border border-border rounded-2xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            Core Values
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {coreValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/6 border border-primary/12 text-primary"
            >
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
