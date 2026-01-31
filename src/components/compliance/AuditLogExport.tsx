import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import type { Json } from "@/integrations/supabase/types";

interface AuditLogEntry {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Json | null;
  actor_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface AuditLogExportProps {
  entries: AuditLogEntry[] | undefined;
  isLoading: boolean;
}

export function AuditLogExport({ entries, isLoading }: AuditLogExportProps) {
  const exportCSV = () => {
    if (!entries || entries.length === 0) return;

    const headers = ["Timestamp", "Actor", "Action", "Target Type", "Target ID", "Metadata"];
    const rows = entries.map((e) => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.actor_profile?.full_name || e.actor_profile?.email || "System",
      e.action,
      e.target_type || "",
      e.target_id || "",
      e.metadata ? JSON.stringify(e.metadata) : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `compliance-audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPDF = () => {
    if (!entries || entries.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Compliance Audit Log Report", margin, yPos);
    yPos += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy h:mm a")}`, margin, yPos);
    doc.text(`Total Entries: ${entries.length}`, pageWidth - margin - 40, yPos);
    yPos += 15;

    // Table headers
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const colWidths = [35, 40, 35, 25, 35];
    const headers = ["Timestamp", "Actor", "Action", "Target", "Target ID"];
    
    let xPos = margin;
    headers.forEach((h, i) => {
      doc.text(h, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 2;

    // Line under headers
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    entries.forEach((entry) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      xPos = margin;
      const row = [
        format(new Date(entry.created_at), "MM/dd/yy HH:mm"),
        (entry.actor_profile?.full_name || entry.actor_profile?.email || "System").slice(0, 20),
        entry.action.replace(/_/g, " ").slice(0, 18),
        (entry.target_type || "—").slice(0, 12),
        (entry.target_id || "—").slice(0, 12),
      ];

      row.forEach((cell, i) => {
        doc.text(cell, xPos, yPos);
        xPos += colWidths[i];
      });
      yPos += 5;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} of ${pageCount} | TSM Roofing Compliance Audit Log`,
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`compliance-audit-log-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportCSV}
        disabled={isLoading || !entries || entries.length === 0}
      >
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportPDF}
        disabled={isLoading || !entries || entries.length === 0}
      >
        <FileText className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
}
