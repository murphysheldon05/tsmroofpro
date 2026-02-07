import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  Lock,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MasterSOPCardProps {
  number: number;
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  isAcknowledged: boolean;
  onAcknowledge: (sopNumber: number) => Promise<void>;
  isAcknowledging: boolean;
}

export function MasterSOPCard({
  number,
  id,
  title,
  summary,
  fullContent,
  isAcknowledged,
  onAcknowledge,
  isAcknowledging,
}: MasterSOPCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset scroll state when collapsible closes
  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  // Check if scrolled to bottom
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Consider scrolled to bottom if within 50px of bottom
      if (scrollHeight - scrollTop - clientHeight < 50) {
        setHasScrolledToBottom(true);
      }
    }
  };

  // Check on open if content is short enough that no scroll is needed
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight) {
        // Content fits without scrolling
        setHasScrolledToBottom(true);
      }
    }
  }, [isOpen]);

  const handleAcknowledge = async () => {
    await onAcknowledge(number);
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
            : "border-border/50"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Badge 
                  variant={isAcknowledged ? "default" : "outline"} 
                  className={cn(
                    "font-mono text-xs flex-shrink-0",
                    isAcknowledged && "bg-green-600"
                  )}
                >
                  {id}
                </Badge>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm sm:text-base truncate">{title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                    {summary}
                  </p>
                </div>
              </div>
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
            <div className="border rounded-lg bg-muted/30">
              {/* Scroll area with content */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="max-h-[400px] overflow-y-auto p-4"
              >
                <div ref={contentRef} className="prose prose-sm dark:prose-invert max-w-none">
                  {/* Render markdown-like content */}
                  {fullContent.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return (
                        <h2 key={i} className="text-lg font-semibold mt-4 mb-2 text-primary">
                          {line.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (line.startsWith('- ')) {
                      return (
                        <li key={i} className="ml-4 text-sm">
                          {line.replace('- ', '')}
                        </li>
                      );
                    }
                    if (line.match(/^\d+\. /)) {
                      const content = line.replace(/^\d+\. /, '');
                      // Check for bold text
                      if (content.includes('**')) {
                        const parts = content.split('**');
                        return (
                          <p key={i} className="text-sm mb-1">
                            <span className="font-semibold">{parts[1]}</span>
                            {parts[2]}
                          </p>
                        );
                      }
                      return (
                        <p key={i} className="text-sm mb-1">
                          {content}
                        </p>
                      );
                    }
                    if (line.trim() === '') {
                      return <br key={i} />;
                    }
                    return (
                      <p key={i} className="text-sm">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Scroll indicator */}
              {!hasScrolledToBottom && !isAcknowledged && (
                <div className="px-4 py-2 border-t bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Scroll to the bottom to unlock acknowledgment
                </div>
              )}
            </div>

            {/* Acknowledgment section */}
            {!isAcknowledged && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`ack-${id}`}
                    checked={canAcknowledge && isAcknowledging}
                    disabled={!canAcknowledge || isAcknowledging}
                    onCheckedChange={() => {
                      if (canAcknowledge) handleAcknowledge();
                    }}
                  />
                  <label 
                    htmlFor={`ack-${id}`} 
                    className={cn(
                      "text-sm cursor-pointer",
                      !canAcknowledge && "text-muted-foreground"
                    )}
                  >
                    I have read and understand this SOP
                  </label>
                </div>
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
              <div className="mt-4 p-3 bg-green-500/10 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">You have acknowledged this SOP</span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
