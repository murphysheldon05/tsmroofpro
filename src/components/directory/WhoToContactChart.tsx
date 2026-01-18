import { Phone, Mail, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ContactRole {
  role: string;
  contactTitle: string;
  description: string;
}

const contactRoles: ContactRole[] = [
  { role: "Sales Questions", contactTitle: "Sales Manager", description: "Contracts, leads, pricing" },
  { role: "Production Issues", contactTitle: "Production Manager", description: "Build schedule, crews, materials" },
  { role: "Supplement Help", contactTitle: "Supplements Team Lead", description: "Claims, documentation" },
  { role: "IT / Systems", contactTitle: "Office Admin", description: "System access, tech issues" },
  { role: "HR / Benefits", contactTitle: "HR Manager", description: "Time off, benefits, policies" },
  { role: "Accounting / Payroll", contactTitle: "Accounting Manager", description: "Invoices, payments, commissions" },
];

export function WhoToContactChart() {
  return (
    <div className="glass-card rounded-xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        Quick Reference: Who Handles What
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {contactRoles.map((item) => (
          <div
            key={item.role}
            className="p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-all"
          >
            <Badge variant="outline" className="mb-2 text-xs">
              {item.role}
            </Badge>
            <p className="font-medium text-foreground">{item.contactTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
