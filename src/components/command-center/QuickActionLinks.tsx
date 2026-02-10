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
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] border text-sm whitespace-nowrap transition-all duration-150 min-h-[44px] active:scale-[0.98]"
          style={
            action.accent
              ? {
                  background: "rgba(22,163,74,.07)",
                  border: "1px solid rgba(22,163,74,.25)",
                  color: "#16a34a",
                  fontWeight: 600,
                  boxShadow: "0 1px 3px rgba(0,0,0,.05)",
                }
              : {
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontWeight: 500,
                  boxShadow: "0 1px 3px rgba(0,0,0,.05)",
                }
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.05)";
          }}
        >
          <action.icon className="w-4 h-4 flex-shrink-0" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
