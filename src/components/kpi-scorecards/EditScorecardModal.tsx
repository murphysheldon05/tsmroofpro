import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";
import type { KpiScorecardRow } from "@/lib/kpiScorecardVisibility";
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

interface EditScorecardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scorecard: KpiScorecardRow | null;
  onSaved: () => void;
}

export function EditScorecardModal({ open, onOpenChange, scorecard, onSaved }: EditScorecardModalProps) {
  const [tab, setTab] = useState<"replace" | "html">("replace");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [statusActive, setStatusActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const initialHtmlRef = useRef("");

  useEffect(() => {
    if (!open || !scorecard) return;

    setTab("replace");
    setReplaceFile(null);
    setName(scorecard.name);
    setDescription(scorecard.description ?? "");
    setReviewers(scorecard.assigned_reviewers ?? []);
    setVisibleTo(scorecard.visible_to ?? []);
    setStatusActive(scorecard.status === "active");
    setHtmlLoaded(false);
    setHtmlContent("");
    initialHtmlRef.current = "";

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage.from("kpi-scorecards").download(scorecard.storage_path);
      if (cancelled) return;
      if (error) {
        setHtmlContent("");
        initialHtmlRef.current = "";
        setHtmlLoaded(true);
        return;
      }
      const text = await data.text();
      if (!cancelled) {
        setHtmlContent(text);
        initialHtmlRef.current = text;
        setHtmlLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, scorecard]);

  const onReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setReplaceFile(f);
  };

  const save = async () => {
    if (!scorecard) return;
    const n = name.trim();
    if (!n) {
      toast.error("Scorecard name is required.");
      return;
    }
    if (description.length > MAX_DESC) {
      toast.error(`Description must be ${MAX_DESC} characters or less.`);
      return;
    }

    let storagePath = scorecard.storage_path;
    const oldPath = scorecard.storage_path;

    setSaving(true);
    try {
      if (replaceFile) {
        const base = slugify(n) || "scorecard";
        storagePath = `scorecards/${base}-${Date.now()}.html`;
        const { error: upErr } = await supabase.storage
          .from("kpi-scorecards")
          .upload(storagePath, replaceFile, { contentType: "text/html", upsert: false });
        if (upErr) {
          toast.error(upErr.message);
          return;
        }
        if (oldPath !== storagePath) {
          await supabase.storage.from("kpi-scorecards").remove([oldPath]);
        }
      } else if (htmlLoaded && htmlContent !== initialHtmlRef.current) {
        const blob = new Blob([htmlContent], { type: "text/html" });
        if (blob.size > MAX_BYTES) {
          toast.error("HTML content must be 5MB or smaller.");
          return;
        }
        const { error: upErr } = await supabase.storage
          .from("kpi-scorecards")
          .upload(scorecard.storage_path, blob, { contentType: "text/html", upsert: true });
        if (upErr) {
          toast.error(upErr.message);
          return;
        }
        initialHtmlRef.current = htmlContent;
      }

      const { error: updErr } = await supabase
        .from("kpi_scorecards")
        .update({
          name: n,
          description: description.trim() || null,
          storage_path: storagePath,
          assigned_reviewers: reviewers.length ? reviewers : null,
          visible_to: visibleTo.length ? visibleTo : null,
          status: statusActive ? "active" : "inactive",
        })
        .eq("id", scorecard.id);

      if (updErr) {
        toast.error(updErr.message);
        return;
      }

      toast.success("Scorecard updated");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!scorecard) return null;

  const lastUpdated = new Date(scorecard.updated_at).toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit scorecard</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "replace" | "html")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="replace">Replace File</TabsTrigger>
            <TabsTrigger value="html">Edit HTML</TabsTrigger>
          </TabsList>
          <TabsContent value="replace" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Current file path: <span className="font-mono text-foreground/80">{scorecard.storage_path}</span>
            </p>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <Input type="file" accept=".html,text/html" onChange={onReplaceFileChange} className="cursor-pointer" />
              {replaceFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  {replaceFile.name} — {(replaceFile.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="html" className="space-y-2 mt-3">
            {!htmlLoaded ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading HTML…
              </div>
            ) : (
              <>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full min-h-[300px] rounded-md border border-border px-3 py-2 text-sm font-mono bg-[#1a1a1a] text-[#e0e0e0] resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">{htmlContent.length} characters</p>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="ekpi-name">Scorecard name *</Label>
            <Input id="ekpi-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ekpi-desc">Description</Label>
            <Input
              id="ekpi-desc"
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
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
            <Label htmlFor="ekpi-status" className="cursor-pointer">
              Status
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{statusActive ? "Active" : "Inactive"}</span>
              <Switch id="ekpi-status" checked={statusActive} onCheckedChange={setStatusActive} />
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
