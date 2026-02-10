import { useNavigate } from "react-router-dom";
import { Calendar, Truck, Shield, DollarSign } from "lucide-react";

const quickActions = [
  { label: "Build Schedule", href: "/build-schedule", icon: Calendar, accent: false },
  { label: "Delivery Schedule", href: "/delivery-schedule", icon: Truck, accent: false },
  { label: "Submit Warranty", href: "/warranties", icon: Shield, accent: false },
  { label: "Submit Commission", href: "/commissions/new", icon: DollarSign, accent: true },
];

export function QuickActionLinks() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1" style={{ touchAction: 'pan-x pan-y' }}>
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.href)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all duration-150 min-h-[44px] hover:shadow-md active:scale-[0.98] ${
            action.accent
              ? "bg-primary/[0.06] border-primary/20 text-primary hover:bg-primary/10"
              : "bg-card border-border/50 text-foreground hover:bg-muted/50"
          }`}
        >
          <action.icon className="w-4 h-4 flex-shrink-0" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
