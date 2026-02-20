import { AppLayout } from "@/components/layout/AppLayout";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { commissionFormSteps } from "@/components/tutorial/tutorialSteps";

export default function CommissionDocumentNew() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <CommissionDocumentForm />
        <GuidedTour pageName="commission-document-form" pageTitle="Commission Document" steps={commissionFormSteps} />
      </div>
    </AppLayout>
  );
}
