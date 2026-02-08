import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MasterSOPCard } from "@/components/sop/MasterSOPCard";
import { PlaybookCompletionModal } from "@/components/compliance/PlaybookCompletionModal";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";
import { SOPMASTER_CONTENT, SOPMASTER_VERSION } from "@/lib/sopMasterConstants";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  CheckCircle2, 
  Shield,
  Trophy,
  AlertTriangle,
  Search,
  X,
  Home,
  Sparkles,
  Unlock
} from "lucide-react";
import { toast } from "sonner";

export default function MasterPlaybook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const hasTriggeredCompletion = useRef(false);
  
  const {
    sopStatuses,
    completedCount,
    totalCount,
    allCompleted,
    isLoading,
    acknowledgeSOP,
    isAcknowledging,
  } = useMasterSOPAcknowledgments();

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "Team Member";
  const remaining = totalCount - completedCount;

  // Filter playbooks by search
  const filteredPlaybooks = SOPMASTER_CONTENT.filter(pb => 
    pb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pb.phase.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pb.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trigger celebration when user completes all playbooks
  useEffect(() => {
    if (allCompleted && !hasTriggeredCompletion.current && completedCount === totalCount) {
      hasTriggeredCompletion.current = true;
      setShowCompletionModal(true);
      sendCompletionNotification();
    }
  }, [allCompleted, completedCount, totalCount]);

  const sendCompletionNotification = async () => {
    try {
      const { error } = await supabase.functions.invoke("notify-playbook-completion", {
        body: { userId: user?.id },
      });
      if (error) {
        console.error("Failed to send completion notification:", error);
      }
    } catch (e) {
      console.error("Error sending completion notification:", e);
    }
  };

  const handleAcknowledge = async (sopNumber: number) => {
    try {
      await acknowledgeSOP(sopNumber);
      toast.success(`Playbook ${String(sopNumber).padStart(2, "0")} acknowledged!`);
    } catch (e: any) {
      toast.error("Failed to acknowledge: " + e.message);
    }
  };

  const handleCloseModal = () => {
    setShowCompletionModal(false);
    navigate("/command-center");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6 px-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 pb-8">
        {/* Completion Modal with Confetti */}
        <PlaybookCompletionModal 
          open={showCompletionModal} 
          onClose={handleCloseModal}
          userName={userName}
        />

        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-4 mb-6">
            {/* Back button only if all complete */}
            {allCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/command-center")}
                className="flex-shrink-0"
              >
                <Home className="w-4 h-4 mr-2" />
                Hub
              </Button>
            )}
            
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Master Playbook
                </h1>
                <p className="text-muted-foreground text-sm">
                  TSM Roofing LLC — Core Operations
                </p>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="p-5 rounded-2xl border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Acknowledgment Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {completedCount}/{totalCount} Complete
                </span>
                <Badge variant={allCompleted ? "default" : "secondary"}>
                  v{SOPMASTER_VERSION.split("-v")[1] || SOPMASTER_VERSION}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={progressPercent} className="h-3" />
            </div>
          </div>
        </header>

        {/* Status Banner */}
        {!allCompleted ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">
                  Action Required: Complete Master Playbook
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Acknowledge all {totalCount} playbooks to unlock full hub access. 
                  <span className="text-amber-500 font-medium"> {remaining} remaining.</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <Unlock className="h-4 w-4" />
                    Full Access Granted!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    All playbooks acknowledged.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/command-center")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Home className="h-4 w-4 mr-2" />
                Command Center
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search playbooks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-background border-border"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground">
          {filteredPlaybooks.length} playbook{filteredPlaybooks.length !== 1 ? "s" : ""}
        </p>

        {/* Playbook Cards */}
        <div className="space-y-4">
          {filteredPlaybooks.map((playbook) => {
            const status = sopStatuses.find((s) => s.sopNumber === playbook.number);
            return (
              <MasterSOPCard
                key={playbook.number}
                playbook={playbook}
                isAcknowledged={status?.acknowledged || false}
                onAcknowledge={handleAcknowledge}
                isAcknowledging={isAcknowledging}
              />
            );
          })}
        </div>

        {filteredPlaybooks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No playbooks match your search.
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 pb-4 border-t border-border">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">TSM</span>
              </div>
              <span className="font-semibold text-foreground">TSM Roofing LLC</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Master Playbook v{SOPMASTER_VERSION.split("-v")[1] || "2025"}
            </p>
            <p className="text-xs text-muted-foreground">
              Phoenix: (623) 213-8267 • Prescott: (928) 232-3007
            </p>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
