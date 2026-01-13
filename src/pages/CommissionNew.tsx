import { Navigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommissionSubmitForm } from "@/components/commissions/CommissionSubmitForm";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { FileSpreadsheet, Users } from "lucide-react";

export default function CommissionNew() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const isSubcontractor = type === "subcontractor";

  // For employee commissions, use the new Commission Document form
  if (!isSubcontractor) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <CommissionDocumentForm />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              Subcontractor / Referral Commission
            </h1>
            <p className="text-muted-foreground">
              Submit commission for a subcontractor or referral partner
            </p>
          </div>
        </div>

        {/* Form */}
        <CommissionSubmitForm variant="subcontractor" />
      </div>
    </AppLayout>
  );
}
