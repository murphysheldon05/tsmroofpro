import { Link, Navigate } from "react-router-dom";
import { BarChart3, ArrowRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SCORECARD_CARDS = [
  {
    title: "Sales Reps",
    subtitle: "Weekly rep selector",
    reviewedBy: "Sales Managers -> Manny",
    href: "/kpi-scorecards/sales-rep",
  },
  {
    title: "Sales Managers",
    subtitle: "Jordan Pollei, Conrad Demecs",
    reviewedBy: "Sheldon + Manny",
    href: "/kpi-scorecards/sales-manager",
  },
  {
    title: "Office Admin",
    subtitle: "Jayden Abramsen",
    reviewedBy: "Sheldon + Manny",
    href: "/kpi-scorecards/office-admin",
  },
  {
    title: "Operations & Compliance",
    subtitle: "Manny Madrid",
    reviewedBy: "Sheldon (tracking only)",
    href: "/kpi-scorecards/operations",
  },
  {
    title: "Accounting",
    subtitle: "Renice",
    reviewedBy: "Courtney + Sheldon",
    href: "/kpi-scorecards/accounting",
  },
  {
    title: "Production",
    subtitle: "Tim Brown",
    reviewedBy: "Manny + Sheldon",
    href: "/kpi-scorecards/production",
  },
  {
    title: "Supplement",
    subtitle: "Supplement Coordinator",
    reviewedBy: "Manny + Sheldon",
    href: "/kpi-scorecards/supplement",
  },
] as const;

export default function KpiScorecards() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManager = role === "manager" || role === "sales_manager";

  if (!isAdmin && !isManager) {
    return <Navigate to="/command-center" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex items-start gap-4 rounded-[18px] border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">
            KPI Scorecards
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Weekly department scorecards for sales, office, operations, accounting,
            production, and supplement performance.
          </p>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            {isAdmin
              ? "Admin access: all scorecards editable"
              : "Manager access: all scorecards editable"}
          </Badge>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SCORECARD_CARDS.map((card) => (
          <Card
            key={card.href}
            className="overflow-hidden border-border/70 bg-card shadow-sm"
          >
            <div className="bg-[#1A1A1A] px-5 py-4">
              <h2 className="text-lg font-bold text-white">{card.title}</h2>
            </div>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {card.subtitle}
                </p>
                <Badge
                  variant="outline"
                  className="border-[#00D26A]/40 bg-[#00D26A]/10 text-[#008F49]"
                >
                  Reviewed by: {card.reviewedBy}
                </Badge>
              </div>

              <Button
                asChild
                className="w-full bg-[#00D26A] text-[#0B0B0B] hover:bg-[#00BD61]"
              >
                <Link to={card.href}>
                  Score This Week
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
