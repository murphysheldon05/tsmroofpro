import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UserUuidMultiSelect } from "./UserUuidMultiSelect";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DESC = 200;

interface AddScorecardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: () => void;
}

export function AddScorecardModal({ open, onOpenChange, userId, onSaved }: AddScorecardModalProps) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pasteHtml, setPasteHtml] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [statusActive, setStatusActive] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTab("upload");
      setFile(null);
      setPasteHtml("");
      setName("");
      setDescription("");
      setReviewers([]);
      setVisibleTo([]);
      setStatusActive(true);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".html")) {
      toast.error("Please choose an .html file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be 5MB or smaller.");
      return;
    }
    setFile(f);
  };

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("Scorecard name is required.");
      return;
    }
    if (description.length > MAX_DESC) {
      toast.error(`Description must be ${MAX_DESC} characters or less.`);
      return;
    }
    let body: Blob;
    if (tab === "upload") {
      if (!file) {
        toast.error("Upload an HTML file or switch to Paste HTML.");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("File must be 5MB or smaller.");
        return;
      }
      body = file;
    } else {
      if (!pasteHtml.trim()) {
        toast.error("Paste HTML content or switch to Upload File.");
        return;
      }
      body = new Blob([pasteHtml], { type: "text/html" });
      if (body.size > MAX_BYTES) {
        toast.error("HTML content must be 5MB or smaller.");
        return;
      }
    }

    const base = slugify(n) || "scorecard";
    const path = `scorecards/${base}-${Date.now()}.html`;

    setSaving(true);
    try {
      const { error: upErr } = await supabase.storage
        .from("kpi-scorecards")
        .upload(path, body, { contentType: "text/html", upsert: false });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      const { error: insErr } = await supabase.from("kpi_scorecards").insert({
        name: n,
        description: description.trim() || null,
        storage_path: path,
        assigned_reviewers: reviewers.length ? reviewers : null,
        visible_to: visibleTo.length ? visibleTo : null,
        status: statusActive ? "active" : "inactive",
        created_by: userId,
      });
      if (insErr) {
        await supabase.storage.from("kpi-scorecards").remove([path]);
        toast.error(insErr.message);
        return;
      }
      toast.success("Scorecard created");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add scorecard</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "paste")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="paste">Paste HTML</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-3 mt-3">
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".html,text/html"
                onChange={onFileChange}
                className="cursor-pointer"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  {file.name} — {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            {previewUrl && (
              <div className="space-y-1">
                <Label className="text-xs">Preview</Label>
                <iframe
                  title="Preview"
                  src={previewUrl}
                  className="w-full h-[200px] rounded-md border border-border bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            )}
          </TabsContent>
          <TabsContent value="paste" className="space-y-2 mt-3">
            <textarea
              value={pasteHtml}
              onChange={(e) => setPasteHtml(e.target.value)}
              placeholder="Paste your scorecard HTML here..."
              className="w-full min-h-[300px] rounded-md border border-border px-3 py-2 text-sm font-mono bg-[#1a1a1a] text-[#e0e0e0] resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">{pasteHtml.length} characters</p>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="kpi-name">Scorecard name *</Label>
            <Input
              id="kpi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jayden — Office Admin KPI"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kpi-desc">Description</Label>
            <Input
              id="kpi-desc"
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/{MAX_DESC}</p>
          </div>
          <UserUuidMultiSelect label="Assigned reviewer(s)" value={reviewers} onChange={setReviewers} />
          <UserUuidMultiSelect
            label="Visible to"
            value={visibleTo}
            onChange={setVisibleTo}
            helperText="Leave empty for admin-only access"
          />
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <Label htmlFor="kpi-status" className="cursor-pointer">
              Status
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{statusActive ? "Active" : "Inactive"}</span>
              <Switch id="kpi-status" checked={statusActive} onCheckedChange={setStatusActive} />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
