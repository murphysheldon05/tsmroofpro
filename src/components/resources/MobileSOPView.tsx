import { Resource } from "@/hooks/useResources";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink,
  Download,
  ArrowLeft,
  Clock,
  Eye,
  FileText,
  CheckCircle,
  User,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface MobileSOPViewProps {
  resource: Resource;
  onBack?: () => void;
}

/**
 * Mobile-optimized SOP consumption view.
 * Designed for one-handed phone reading with:
 * - No horizontal scrolling
 * - Step-by-step format
 * - Short paragraphs
 * - Clear headings
 * - Tables converted to stacked cards
 * - Quick Steps summary at top
 */
export function MobileSOPView({ resource, onBack }: MobileSOPViewProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleOpenUrl = () => {
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  // Extract quick steps from body content (look for numbered lists or bullet points)
  const extractQuickSteps = (html: string): string[] => {
    const steps: string[] = [];
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    // Look for list items
    const listItems = tempDiv.querySelectorAll("li");
    listItems.forEach((item, index) => {
      if (index < 5 && item.textContent) {
        steps.push(item.textContent.trim().slice(0, 80) + (item.textContent.length > 80 ? "..." : ""));
      }
    });
    
    return steps;
  };

  // Convert tables to card format for mobile
  const convertTablesToCards = (html: string): string => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    const tables = tempDiv.querySelectorAll("table");
    tables.forEach((table) => {
      const headers = Array.from(table.querySelectorAll("th")).map((th) => th.textContent || "");
      const rows = table.querySelectorAll("tbody tr");
      
      let cardHtml = '<div class="sop-cards-container space-y-3">';
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        cardHtml += '<div class="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1.5">';
        cells.forEach((cell, index) => {
          const headerText = headers[index] || `Field ${index + 1}`;
          cardHtml += `
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] uppercase text-muted-foreground font-medium">${headerText}</span>
              <span class="text-sm">${cell.innerHTML}</span>
            </div>
          `;
        });
        cardHtml += "</div>";
      });
      cardHtml += "</div>";
      
      const cardContainer = document.createElement("div");
      cardContainer.innerHTML = cardHtml;
      table.replaceWith(cardContainer);
    });
    
    return tempDiv.innerHTML;
  };

  const quickSteps = resource.body ? extractQuickSteps(resource.body) : [];
  const processedBody = resource.body ? convertTablesToCards(resource.body) : "";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 p-3 sm:p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-2 -ml-2 h-8 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to SOP Library
        </Button>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              {resource.title}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] py-0">
                {resource.version}
              </Badge>
              {resource.categories?.name && (
                <Badge variant="outline" className="text-[10px] py-0">
                  {resource.categories.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-4">
          {/* Meta Info - Compact */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground py-2 px-3 rounded-lg bg-muted/30">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {formatDistanceToNow(new Date(resource.updated_at), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {resource.view_count} views
            </span>
          </div>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          {resource.description && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm text-foreground leading-relaxed">
                {resource.description}
              </p>
            </div>
          )}

          {/* Quick Steps Summary */}
          {quickSteps.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Quick Steps
              </h2>
              <ol className="space-y-1.5">
                {quickSteps.map((step, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Main Body Content */}
          {resource.body && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-3
                prose-li:text-foreground/90 prose-li:marker:text-primary
                prose-strong:text-foreground
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                [&_table]:hidden [&_.sop-cards-container]:block"
              dangerouslySetInnerHTML={{ __html: processedBody }}
            />
          )}

          {/* No Content Message */}
          {!resource.body && !resource.url && !resource.file_path && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No content available</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {resource.url && (
              <Button onClick={handleOpenUrl} className="w-full gap-2">
                <ExternalLink className="w-4 h-4" />
                Open External Link
              </Button>
            )}
            {resource.file_path && (
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download Document
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
