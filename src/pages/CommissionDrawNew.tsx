import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DrawRequestSubmitForm } from "@/components/commissions/DrawRequestSubmitForm";
import { DollarSign } from "lucide-react";

export default function CommissionDrawNew() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold">
              Request a Draw
            </h1>
            <p className="text-muted-foreground">
              Request an advance against a future job&apos;s commission. Maximum is 50% of estimated commission, capped at $1,500 without manager approval.
            </p>
          </div>
        </div>

        {/* Form */}
        <DrawRequestSubmitForm onCancel={() => navigate("/commissions")} />
      </div>
    </AppLayout>
  );
}
