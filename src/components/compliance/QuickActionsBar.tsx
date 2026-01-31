import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Ban, FileText, Download } from "lucide-react";

interface QuickActionsBarProps {
  onLogViolation: () => void;
  onApplyHold: () => void;
  onViewAuditLog: () => void;
  onExportReport: () => void;
  isExporting?: boolean;
}

export function QuickActionsBar({
  onLogViolation,
  onApplyHold,
  onViewAuditLog,
  onExportReport,
  isExporting,
}: QuickActionsBarProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button 
            variant="default" 
            size="sm" 
            onClick={onLogViolation}
            className="flex-1 sm:flex-none"
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Log </span>Violation
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onApplyHold}
            className="flex-1 sm:flex-none"
          >
            <Ban className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Apply </span>Hold
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewAuditLog}
            className="flex-1 sm:flex-none"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">View </span>Audit Log
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onExportReport}
            disabled={isExporting}
            className="flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExporting ? "Exporting..." : "Export Report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
