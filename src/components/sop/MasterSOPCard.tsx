import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SOPFlowDiagram } from "./SOPFlowDiagram";
import { ViolationBadge } from "./ViolationBadge";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Loader2,
  Zap,
  FileText,
  AlertTriangle,
  Settings,
  X,
  DollarSign,
  ClipboardCheck,
  Shield,
  Users,
  UserPlus,
  MessageSquare,
  Database,
  Calendar,
  Truck,
  ChevronRight,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MasterSOPContent } from "@/lib/sopMasterConstants";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  ClipboardCheck,
  FileText,
  Shield,
  Users,
  UserPlus,
  MessageSquare,
  Database,
  Calendar,
  Truck,
};

interface MasterSOPCardProps {
  sop: MasterSOPContent;
  isAcknowledged: boolean;
  onAcknowledge: (sopId: string) => Promise<void>;
  isAcknowledging: boolean;
}

export function MasterSOPCard({
  sop,
  isAcknowledged,
  onAcknowledge,
  isAcknowledging,
}: MasterSOPCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [activeTab, setActiveTab] = useState("flow");
  const scrollRef = useRef<HTMLDivElement>(null);

  const IconComponent = iconMap[sop.icon] || FileText;

  // Reset scroll state when collapsible closes
  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToBottom(false);
      setActiveTab("flow");
    }
  }, [isOpen]);

  // Check if scrolled to bottom
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight - scrollTop - clientHeight < 50) {
        setHasScrolledToBottom(true);
      }
    }
  };

  // Check on tab change if content fits without scrolling
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [isOpen, activeTab]);

  const handleAcknowledge = async () => {
    await onAcknowledge(sop.id);
  };

  const canAcknowledge = hasScrolledToBottom && !isAcknowledged;

  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isAcknowledged
          ? "border-green-500/30 bg-green-500/5"
          : isOpen
          ? "border-primary/30 shadow-lg"
          : "border-border/50 hover:border-border"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    isAcknowledged ? "bg-green-500/20" : "bg-primary/10"
                  )}
                >
                  <IconComponent
                    className={cn(
                      "h-5 w-5",
                      isAcknowledged ? "text-green-500" : "text-primary"
                    )}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={isAcknowledged ? "default" : "outline"}
                      className={cn(
                        "font-mono text-xs",
                        isAcknowledged && "bg-green-600 hover:bg-green-600"
                      )}
                    >
                      SOP {sop.number}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {sop.phase}
                    </span>
                    {isAcknowledged && (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Acknowledged</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mt-1 truncate">
                    {sop.title}
                  </h3>
                  {!isOpen && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {sop.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Status & Chevron */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAcknowledged ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {/* Close Button */}
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="gap-1 text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="flow" className="text-xs sm:text-sm">
                  Flow
                </TabsTrigger>
                <TabsTrigger value="criteria" className="text-xs sm:text-sm">
                  Criteria
                </TabsTrigger>
                <TabsTrigger value="rules" className="text-xs sm:text-sm">
                  Rules
                </TabsTrigger>
                <TabsTrigger value="enforcement" className="text-xs sm:text-sm">
                  Enforce
                </TabsTrigger>
              </TabsList>

              {/* Scrollable content area */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="max-h-[400px] overflow-y-auto"
              >
                <TabsContent value="flow" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
                        Authoritative Process Flow
                      </h4>
                    </div>
                    <SOPFlowDiagram steps={sop.flowSteps} />
                  </div>
                </TabsContent>

                <TabsContent value="criteria" className="mt-0">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Entry Criteria */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                          Entry Criteria
                        </h4>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
                        {sop.entryCriteria.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <Circle className="h-2 w-2 text-amber-500 mt-1.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Exit Criteria */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Unlock className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
                          Exit Criteria
                        </h4>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
                        {sop.exitCriteria.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rules" className="mt-0 space-y-6">
                  {/* Governing Rules */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
                        Governing Rules
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {sop.rules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 border border-border"
                        >
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {rule}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Zero Tolerance */}
                  {sop.zeroTolerance.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-destructive">
                          Zero Tolerance
                        </h4>
                      </div>
                      <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 space-y-3">
                        {sop.zeroTolerance.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2">
                              <ViolationBadge severity={item.severity} />
                              <span className="text-sm text-muted-foreground">
                                {item.violation}
                              </span>
                            </div>
                            <span className="text-xs text-destructive whitespace-nowrap">
                              {item.consequence}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="enforcement" className="mt-0">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
                        System Enforcement
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {sop.systemEnforcement.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-lg p-3 bg-primary/5 border border-primary/20"
                        >
                          <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Scroll indicator */}
            {!hasScrolledToBottom && !isAcknowledged && (
              <div className="mt-4 px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2 rounded-lg border border-amber-500/20">
                <Lock className="h-3 w-3" />
                Scroll through all tabs to unlock acknowledgment
              </div>
            )}

            {/* Acknowledgment section */}
            {!isAcknowledged && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                <p
                  className={cn(
                    "text-sm",
                    !canAcknowledge && "text-muted-foreground"
                  )}
                >
                  I have read and understand this SOP
                </p>
                <Button
                  size="sm"
                  disabled={!canAcknowledge || isAcknowledging}
                  onClick={handleAcknowledge}
                >
                  {isAcknowledging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Acknowledge
                    </>
                  )}
                </Button>
              </div>
            )}

            {isAcknowledged && (
              <div className="mt-4 p-3 bg-green-500/10 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 border border-green-500/20">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  You have acknowledged this SOP
                </span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
