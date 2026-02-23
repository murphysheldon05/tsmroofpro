import { useNavigate } from "react-router-dom";
import {
  FileText,
  GraduationCap,
  Send,
  Building2,
  Wrench,
  Shield,
} from "lucide-react";

const quickLinks = [
  {
    title: "SOPs",
    description: "Access procedures",
    icon: FileText,
    href: "/playbook-library/sales",
  },
  {
    title: "Training",
    description: "Learning resources",
    icon: GraduationCap,
    href: "/training/documents",
  },
  {
    title: "Submit Request",
    description: "Forms & requests",
    icon: Send,
    href: "/requests",
  },
  {
    title: "Company Info",
    description: "Values & policies",
    icon: Building2,
    href: "/command-center",
  },
  {
    title: "Tools",
    description: "Systems & tools",
    icon: Wrench,
    href: "/tools",
  },
  {
    title: "Safety",
    description: "Safety & HR",
    icon: Shield,
    href: "/playbook-library/safety-hr",
  },
];

export function QuickLinks() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {quickLinks.map((link) => (
        <button
          key={link.title}
          onClick={() => navigate(link.href)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/60 border border-primary/10 hover:border-primary/40 hover:bg-card/80 hover:shadow-[0_0_25px_hsl(var(--primary)/0.15)] transition-all duration-300 group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-all duration-300">
            <link.icon className="w-5 h-5 text-primary group-hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.title}</p>
            <p className="text-xs text-muted-foreground">{link.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
