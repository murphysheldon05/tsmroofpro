import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRoleOnboarding } from "@/hooks/useRoleOnboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  GraduationCap,
  CheckCircle2,
  ChevronDown,
  BookOpen,
  ClipboardCheck,
  FileText,
  PenLine,
  Loader2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sectionTypeIcons: Record<string, React.ElementType> = {
  reading: BookOpen,
  checklist: ClipboardCheck,
  reference: FileText,
  sign_off: PenLine,
};

export default function RoleOnboarding() {
  const {
    sop,
    sections,
    acknowledgedIds,
    completedCount,
    totalRequired,
    allSectionsAcknowledged,
    isComplete,
    completion,
    isLoading,
    acknowledge,
    submitSignature,
  } = useRoleOnboarding();

  const [openSections, setOpenSections] = useState<string[]>([]);
  const [signature, setSignature] = useState("");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!sop) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-12 text-center space-y-4 px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">No Onboarding SOP Assigned</h1>
          <p className="text-muted-foreground">
            There is no active Role Onboarding SOP for your current role. Check back later or contact your Admin.
          </p>
        </div>
      </AppLayout>
    );
  }

  const progress = totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0;

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAcknowledge = async (sectionId: string) => {
    try {
      await acknowledge.mutateAsync(sectionId);
      toast.success("Section acknowledged");
    } catch {
      toast.error("Failed to acknowledge section");
    }
  };

  const handleSubmitSignature = async () => {
    if (!signature.trim()) {
      toast.error("Please type your full legal name to sign");
      return;
    }
    try {
      await submitSignature.mutateAsync(signature.trim());
      toast.success("Onboarding SOP completed! Welcome to the team!");
    } catch {
      toast.error("Failed to submit signature");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{sop.title}</h1>
                <Badge variant="outline" className="text-xs">{sop.version}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{sop.description}</p>
            </div>
          </div>
        </header>

        {/* Completion Banner */}
        {isComplete && completion && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Onboarding Complete</p>
                <p className="text-sm text-muted-foreground">
                  Signed by {completion.electronic_signature} on{" "}
                  {new Date(completion.completed_at).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {!isComplete && (
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{completedCount} / {totalRequired} sections</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((section) => {
            const isAcked = acknowledgedIds.has(section.id);
            const Icon = sectionTypeIcons[section.section_type] || FileText;

            return (
              <Collapsible
                key={section.id}
                open={openSections.includes(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <Card className={cn(
                  "transition-colors",
                  isAcked && "border-primary/20 bg-primary/[0.02]"
                )}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer py-4">
                      <div className="flex items-center gap-3">
                        {isAcked ? (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {section.section_number}.
                            </span>
                            <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Icon className="w-3 h-3" />
                            {section.section_type}
                          </Badge>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            openSections.includes(section.id) && "rotate-180"
                          )} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-line">
                        {section.content}
                      </div>
                      {section.is_acknowledgment_required && !isAcked && !isComplete && (
                        <Button
                          size="sm"
                          onClick={() => handleAcknowledge(section.id)}
                          disabled={acknowledge.isPending}
                          className="gap-2"
                        >
                          {acknowledge.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          I Acknowledge
                        </Button>
                      )}
                      {isAcked && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Acknowledged
                        </p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Electronic Signature */}
        {allSectionsAcknowledged && !isComplete && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PenLine className="w-5 h-5 text-primary" />
                Electronic Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                By typing your full legal name below, you confirm that you have read and understood all sections
                of this Role Onboarding SOP.
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Type your full legal name"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Date: {new Date().toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              <Button
                onClick={handleSubmitSignature}
                disabled={submitSignature.isPending || !signature.trim()}
                className="gap-2"
              >
                {submitSignature.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Submit Electronic Signature
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
