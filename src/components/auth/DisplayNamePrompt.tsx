import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DisplayNamePromptProps {
  open: boolean;
  onCompleted: () => void;
}

export function DisplayNamePrompt({ open, onCompleted }: DisplayNamePromptProps) {
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCurrentName = async () => {
      if (!open) return;
      setLoading(true);
      setError("");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        setFullName(data?.full_name || "");
      } catch (e) {
        console.error("Failed to load display name:", e);
      } finally {
        setLoading(false);
      }
    };
    loadCurrentName();
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = fullName.trim();
    if (!trimmed) {
      setError("Please enter your first and last name.");
      return;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      setError("Please enter both your first and last name.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to update your name.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Name updated successfully");
      onCompleted();
    } catch (e: any) {
      console.error("Failed to update name:", e);
      setError(e.message || "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  const isValid = (() => {
    const trimmed = fullName.trim();
    if (!trimmed) return false;
    const parts = trimmed.split(/\s+/);
    return parts.length >= 2;
  })();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Add Your Name</DialogTitle>
          </div>
          <DialogDescription>
            We use your name across the app in the Admin Panel, commission records, and messages. Please confirm your first and last name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="display-name" className="text-sm font-medium">
              Full name (First Last)
            </label>
            <Input
              id="display-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jordan Smith"
              autoFocus
              disabled={loading || saving}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || saving || !isValid}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Name"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

