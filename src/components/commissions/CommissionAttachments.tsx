import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileText, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentFile extends File {
  documentType?: string;
}

interface CommissionAttachmentsProps {
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  readOnly?: boolean;
}

export function CommissionAttachments({ 
  attachments, 
  onAttachmentsChange, 
  readOnly = false 
}: CommissionAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTypes, setDocumentTypes] = useState<Record<number, string>>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAttachmentsChange([...attachments, ...files]);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
    
    // Also remove the document type
    const newTypes = { ...documentTypes };
    delete newTypes[index];
    setDocumentTypes(newTypes);
  };

  const handleDocumentTypeChange = (index: number, type: string) => {
    setDocumentTypes({ ...documentTypes, [index]: type });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center gap-4">
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Documents
          </Button>
          <span className="text-sm text-muted-foreground">
            Accepted: PDF, Word, Images (Max 10MB each)
          </span>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg border bg-muted/30",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              {getFileIcon(file)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              
              <Select
                value={documentTypes[index] || ""}
                onValueChange={(value) => handleDocumentTypeChange(index, value)}
                disabled={readOnly}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Signed Contract</SelectItem>
                  <SelectItem value="supplement">Approved Supplement</SelectItem>
                  <SelectItem value="invoice">Final Invoice</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No documents attached yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload signed contracts, supplements, and invoices
          </p>
        </div>
      )}
    </div>
  );
}
