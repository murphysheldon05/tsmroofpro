import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hammer, Truck, Shield, DollarSign, Ruler } from "lucide-react";

const quickLinks = [
  {
    label: "Build Schedule",
    href: "/build-schedule",
    icon: Hammer,
    variant: "outline" as const,
  },
  {
    label: "Delivery Schedule",
    href: "/delivery-schedule",
    icon: Truck,
    variant: "outline" as const,
  },
  {
    label: "Submit Warranty",
    href: "/warranties",
    icon: Shield,
    variant: "outline" as const,
  },
  {
    label: "Submit Commission",
    href: "/commissions/new",
    icon: DollarSign,
    variant: "outline" as const,
  },
  {
    label: "Shingle ID Guide",
    href: "/training/shingle-identification",
    icon: Ruler,
    variant: "outline" as const,
  },
];

export function CommandCenterQuickLinks() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      {quickLinks.map((link) => (
        <Button
          key={link.label}
          variant={link.variant}
          onClick={() => navigate(link.href)}
          className="flex items-center gap-2 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)] transition-all duration-200"
        >
          <link.icon className="w-4 h-4" />
          {link.label}
        </Button>
      ))}
    </div>
  );
}
