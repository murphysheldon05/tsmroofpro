import { useSearchParams } from "react-router-dom";
import { CommissionSubmitForm } from "@/components/commissions/CommissionSubmitForm";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { RepairCommissionForm } from "@/components/commissions/RepairCommissionForm";
import { Users } from "lucide-react";

export default function CommissionNew() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");

  if (type === "repair") {
    return (
      <div className="max-w-4xl mx-auto">
        <RepairCommissionForm />
      </div>
    );
  }

  if (type === "subcontractor") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-extrabold">
              Subcontractor / Referral Commission
            </h1>
            <p className="text-muted-foreground">
              Submit commission for a subcontractor or referral partner
            </p>
          </div>
        </div>
        <CommissionSubmitForm variant="subcontractor" />
      </div>
    );
  }

  // Default: standard employee commission form
  return (
    <div className="max-w-4xl mx-auto">
      <CommissionDocumentForm />
    </div>
  );
}
