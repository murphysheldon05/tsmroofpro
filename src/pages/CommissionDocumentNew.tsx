import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { commissionFormSteps } from "@/components/tutorial/tutorialSteps";

export default function CommissionDocumentNew() {
  return (
    <div className="container mx-auto py-6">
      <CommissionDocumentForm />
      <GuidedTour pageName="commission-document-form" pageTitle="Commission Document" steps={commissionFormSteps} />
    </div>
  );
}
