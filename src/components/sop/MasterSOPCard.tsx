import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  Loader2,
  X,
  ArrowLeft,
  DollarSign,
  ClipboardCheck,
  FileText,
  Shield,
  Users,
  UserPlus,
  MessageSquare,
  Database,
  Calendar,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaybookTabContent } from "./PlaybookTabContent";
import type { MasterPlaybookContent } from "@/lib/sopMasterConstants";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  ClipboardCheck,
  FileText,
  Shield,
  Users,
  UserPlus,
  MessageSquare,
  Database,
  Calendar,
  Truck
};

interface MasterSOPCardProps {
  playbook: MasterPlaybookContent;
  isAcknowledged: boolean;
  onAcknowledge: (sopNumber: number) => Promise<void>;
  isAcknowledging: boolean;
}

export function MasterSOPCard({
  playbook,
  isAcknowledged,
  onAcknowledge,
  isAcknowledging,
}: MasterSOPCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"flow" | "criteria" | "rules" | "enforcement">("flow");
  const IconComponent = iconMap[playbook.icon] || FileText;

  const handleAcknowledge = async () => {
    await onAcknowledge(playbook.number);
    setIsOpen(false);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 overflow-hidden",
        isAcknowledged 
          ? "border-primary/30 bg-primary/5" 
          : isOpen 
            ? "border-primary/50 shadow-lg shadow-primary/10" 
            : "border-border hover:border-primary/30"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4 px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Icon */}
              <div 
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  isAcknowledged ? "bg-primary/20" : "bg-muted"
                )}
              >
                <IconComponent className={cn("h-6 w-6", isAcknowledged ? "text-primary" : "text-muted-foreground")} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={isAcknowledged ? "default" : "outline"} 
                    className={cn(
                      "font-mono text-xs",
                      isAcknowledged && "bg-primary text-primary-foreground"
                    )}
                  >
                    PLAYBOOK {playbook.id.split("-")[1]}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {playbook.phase}
                  </span>
                  {isAcknowledged && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Acknowledged
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                  {playbook.title}
                </h3>
                {!isOpen && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {playbook.description}
                  </p>
                )}
              </div>

              {/* Status & Toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isAcknowledged && !isOpen && (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 sm:px-6">
            {/* Close Bar */}
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="flow" className="text-xs sm:text-sm">
                  Visual Flow
                </TabsTrigger>
                <TabsTrigger value="criteria" className="text-xs sm:text-sm">
                  Entry/Exit
                </TabsTrigger>
                <TabsTrigger value="rules" className="text-xs sm:text-sm">
                  Rules
                </TabsTrigger>
                <TabsTrigger value="enforcement" className="text-xs sm:text-sm">
                  Enforcement
                </TabsTrigger>
              </TabsList>

              <div className="rounded-xl border bg-card/50 p-4 sm:p-6 min-h-[300px]">
                <PlaybookTabContent playbook={playbook} activeTab={activeTab} />
              </div>
            </Tabs>

            {/* Acknowledge Button */}
            {!isAcknowledged && (
              <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
                <Button
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging}
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isAcknowledging ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      I Acknowledge Playbook {playbook.id.split("-")[1]}
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  By clicking, you confirm you have read and will comply with this playbook
                </p>
              </div>
            )}

            {/* Acknowledged state */}
            {isAcknowledged && (
              <div className="mt-6 p-4 rounded-xl bg-primary/10 flex items-center gap-3 text-primary">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">You have acknowledged this playbook</span>
              </div>
            )}

            {/* Bottom Back Button */}
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Playbook List
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
