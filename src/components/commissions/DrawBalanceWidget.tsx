import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDrawBalance } from "@/hooks/useDrawRequests";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet } from "lucide-react";

export function DrawBalanceWidget() {
  const { role } = useAuth();
  const { data: balance, isLoading } = useDrawBalance();

  // Only show for sales roles
  if (role !== "sales_rep" && role !== "sales_manager") return null;
  if (isLoading) return null;

  const total = balance?.totalOutstanding || 0;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-600" />
          Draw Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div>
            <p className="text-2xl font-extrabold text-amber-600">
              ${total.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {balance?.activeCount || 0} active draw{(balance?.activeCount || 0) !== 1 ? "s" : ""} outstanding
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active draws</p>
        )}
      </CardContent>
    </Card>
  );
}
