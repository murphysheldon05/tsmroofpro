import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ChamberAdminView } from "@/components/chamber/ChamberAdminView";
import { ChamberRepView } from "@/components/chamber/ChamberRepView";

export default function ChamberOfCommerce() {
  const { isAdmin, isManager } = useAuth();
  const isAdminOrManager = isAdmin || isManager;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="pt-4 lg:pt-0 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chamber of Commerce</h1>
          <p className="text-muted-foreground text-sm">
            {isAdminOrManager ? "Manage chambers, events, and rep assignments" : "Your chamber assignments and events"}
          </p>
        </div>
      </header>

      {isAdminOrManager ? <ChamberAdminView /> : <ChamberRepView />}
    </div>
  );
}
