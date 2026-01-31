import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Ban, Calendar, FileText, DollarSign, Lock } from "lucide-react";

interface Hold {
  id: string;
  reason: string;
  hold_type: string;
  created_at?: string;
  job_id?: string | null;
}

interface HoldWarningBannerProps {
  holds: Hold[];
  context?: "commission" | "invoice" | "scheduling" | "general";
}

const holdTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  commission_hold: {
    label: "Commission Hold",
    icon: <DollarSign className="w-4 h-4" />,
    color: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  invoice_hold: {
    label: "Invoice Hold",
    icon: <FileText className="w-4 h-4" />,
    color: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
  scheduling_hold: {
    label: "Scheduling Hold",
    icon: <Calendar className="w-4 h-4" />,
    color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  access_hold: {
    label: "Access Hold",
    icon: <Lock className="w-4 h-4" />,
    color: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  },
};

export function HoldWarningBanner({ holds, context }: HoldWarningBannerProps) {
  if (!holds || holds.length === 0) return null;

  // Filter holds based on context if provided
  const relevantHolds = context
    ? holds.filter((h) => {
        if (context === "commission") return h.hold_type === "commission_hold";
        if (context === "invoice") return h.hold_type === "invoice_hold";
        if (context === "scheduling") return h.hold_type === "scheduling_hold";
        return true;
      })
    : holds;

  if (relevantHolds.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Ban className="w-4 h-4" />
        Active Compliance Hold{relevantHolds.length > 1 ? "s" : ""}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          {relevantHolds.map((hold) => {
            const config = holdTypeConfig[hold.hold_type] || {
              label: hold.hold_type,
              icon: <Ban className="w-4 h-4" />,
              color: "bg-gray-500/15 text-gray-600 border-gray-500/30",
            };

            return (
              <div key={hold.id} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className={`shrink-0 ${config.color}`}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>
                <span className="text-muted-foreground">—</span>
                <span>{hold.reason}</span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground mt-2">
            Contact Ops Compliance to resolve this hold before proceeding.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact inline hold indicator for table rows or small spaces
 */
export function HoldIndicator({ holdType, reason }: { holdType: string; reason: string }) {
  const config = holdTypeConfig[holdType] || {
    label: holdType,
    icon: <Ban className="w-3 h-3" />,
    color: "bg-gray-500/15 text-gray-600 border-gray-500/30",
  };

  return (
    <Badge variant="outline" className={`text-xs ${config.color}`} title={reason}>
      {config.icon}
      <span className="ml-1">Hold</span>
    </Badge>
  );
}
