import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMasterPlaybookAcknowledgments } from "@/hooks/useMasterPlaybookAcknowledgments";
import { MASTER_SOPS, NEON_GREEN, NEON_GREEN_DARK } from "@/lib/masterPlaybookSOPs";
import { SOPMASTER_VERSION } from "@/lib/sopMasterConstants";
import { PlaybookSOPCard } from "@/components/playbook/PlaybookSOPCard";
import { PlaybookConfetti } from "@/components/playbook/PlaybookConfetti";
import { PlaybookCongratulationsModal } from "@/components/playbook/PlaybookCongratulationsModal";
import { toast } from "sonner";
import { BookOpen, Shield, CheckCircle2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MasterPlaybook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    acknowledgedSOPs,
    isLoading,
    allAcknowledged,
    acknowledgedCount,
    totalCount,
    acknowledgeSOP,
    isAcknowledging,
    acknowledgeAll,
    isAcknowledgingAll,
  } = useMasterPlaybookAcknowledgments();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  // Show celebration when all acknowledged
  useEffect(() => {
    if (allAcknowledged && acknowledgedCount === totalCount && !isLoading) {
      // Only trigger if they just completed (check if we haven't shown yet)
      const hasShownKey = `playbook-congrats-${user?.id}-${SOPMASTER_VERSION}`;
      if (!sessionStorage.getItem(hasShownKey)) {
        setShowConfetti(true);
        setTimeout(() => setShowCongrats(true), 500);
        sessionStorage.setItem(hasShownKey, 'true');
      }
    }
  }, [allAcknowledged, acknowledgedCount, totalCount, isLoading, user?.id]);

  const handleAcknowledge = async (sopId: string) => {
    try {
      setAcknowledgingId(sopId);
      await acknowledgeSOP(sopId);
      
      const newCount = acknowledgedCount + 1;
      if (newCount === totalCount) {
        // All done - trigger celebration
        await acknowledgeAll();
        setShowConfetti(true);
        setTimeout(() => setShowCongrats(true), 500);
      } else {
        toast.success(`SOP ${sopId.replace('sop-', '')} acknowledged! ${newCount}/${totalCount} complete`);
        // Auto-expand next unacknowledged SOP
        const nextUnacknowledged = MASTER_SOPS.find(
          (sop) => !acknowledgedSOPs.has(sop.id) && sop.id !== sopId
        );
        if (nextUnacknowledged) {
          setExpandedId(nextUnacknowledged.id);
        }
      }
    } catch (error: any) {
      toast.error("Failed to acknowledge SOP: " + error.message);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const progressPercentage = (acknowledgedCount / totalCount) * 100;

  return (
    <AppLayout>
      <PlaybookConfetti active={showConfetti} />
      <PlaybookCongratulationsModal
        show={showCongrats}
        onClose={() => {
        setShowCongrats(false);
        setShowConfetti(false);
      }}
      userName={user?.email}
    />

      <div className="min-h-screen" style={{ backgroundColor: '#111827' }}>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => navigate("/sops")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${NEON_GREEN}20` }}
            >
              <BookOpen className="w-6 h-6" style={{ color: NEON_GREEN }} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-2xl font-black tracking-tight"
                style={{ color: NEON_GREEN }}
              >
                Master Operating Playbook
              </h1>
              <p className="text-sm text-gray-400">
                Version {SOPMASTER_VERSION} • {totalCount} SOPs to Acknowledge
              </p>
            </div>
          </div>

          {/* Gate Warning */}
          {!allAcknowledged && (
            <Alert
              className="border-amber-500/50"
              style={{ backgroundColor: '#78350F20' }}
            >
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-200">
                <strong>Access Requirement:</strong> You must acknowledge all 10 SOPs below
                to gain full system access. Read each SOP carefully and acknowledge your
                understanding.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Card */}
          <div
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: '#1F2937',
              borderColor: allAcknowledged ? NEON_GREEN : '#374151',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield
                  className="w-5 h-5"
                  style={{ color: allAcknowledged ? NEON_GREEN : '#9CA3AF' }}
                />
                <span className="font-semibold text-white">Acknowledgment Progress</span>
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: allAcknowledged ? NEON_GREEN : '#9CA3AF' }}
              >
                {acknowledgedCount}/{totalCount}
              </span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-3"
              style={
                {
                  '--progress-background': allAcknowledged ? NEON_GREEN : NEON_GREEN_DARK,
                } as React.CSSProperties
              }
            />
            {allAcknowledged && (
              <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: NEON_GREEN }}>
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold">All SOPs Acknowledged — Full Access Granted</span>
              </div>
            )}
          </div>

          {/* SOP Cards */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {MASTER_SOPS.map((sop) => (
                <PlaybookSOPCard
                  key={sop.id}
                  sop={sop}
                  isExpanded={expandedId === sop.id}
                  onToggle={() => setExpandedId(expandedId === sop.id ? null : sop.id)}
                  onClose={() => setExpandedId(null)}
                  isAcknowledged={acknowledgedSOPs.has(sop.id)}
                  onAcknowledge={() => handleAcknowledge(sop.id)}
                  isAcknowledging={acknowledgingId === sop.id}
                />
              ))}
            </div>
          )}

          {/* Bottom Action */}
          {allAcknowledged && (
            <div className="text-center py-6">
              <Button
                size="lg"
                onClick={() => navigate("/command-center")}
                className="font-bold"
                style={{ backgroundColor: NEON_GREEN, color: 'black' }}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Continue to Command Center
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
