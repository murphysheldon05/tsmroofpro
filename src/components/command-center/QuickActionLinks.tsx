import { useNavigate } from "react-router-dom";
import { Calendar, Truck, Shield, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  { label: "Build Schedule", href: "/build-schedule", icon: Calendar, accent: false, borderColor: "border-l-emerald-500", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { label: "Delivery Schedule", href: "/delivery-schedule", icon: Truck, accent: false, borderColor: "border-l-amber-500", iconColor: "text-amber-600 dark:text-amber-400" },
  { label: "Submit Warranty", href: "/warranties", icon: Shield, accent: false, borderColor: "border-l-blue-500", iconColor: "text-blue-600 dark:text-blue-400" },
  { label: "Submit Commission", href: "/commissions/new", icon: DollarSign, accent: true, borderColor: "border-l-primary", iconColor: "text-primary" },
];

export function QuickActionLinks() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1" style={{ touchAction: 'pan-x pan-y' }}>
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.href)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-l-4 text-sm whitespace-nowrap transition-all duration-150 min-h-[44px] active:scale-[0.98] hover:-translate-y-0.5",
            action.borderColor,
            action.accent
              ? "bg-primary/5 border-primary/25 text-primary font-semibold shadow-sm hover:shadow-md"
              : "bg-card border-border text-foreground font-medium shadow-sm hover:shadow-md",
          )}
        >
          <action.icon className={cn("w-4 h-4 flex-shrink-0", action.iconColor)} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
