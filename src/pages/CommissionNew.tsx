import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommissionSubmitForm } from "@/components/commissions/CommissionSubmitForm";
import { FileSpreadsheet, Users } from "lucide-react";

export default function CommissionNew() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const isSubcontractor = type === "subcontractor";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          {isSubcontractor ? (
            <Users className="h-8 w-8 text-primary" />
          ) : (
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {isSubcontractor 
                ? "Subcontractor / Referral Commission" 
                : "Commission Submittal Form"
              }
            </h1>
            <p className="text-muted-foreground">
              {isSubcontractor
                ? "Submit commission for a subcontractor or referral partner"
                : "Submit a new sales commission for review"
              }
            </p>
          </div>
        </div>

        {/* Form */}
        <CommissionSubmitForm variant={isSubcontractor ? "subcontractor" : "employee"} />
      </div>
    </AppLayout>
  );
}
