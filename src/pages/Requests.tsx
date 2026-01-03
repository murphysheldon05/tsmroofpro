import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, FileEdit, Monitor, Users, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const requestTypes = [
  {
    value: "sop_update",
    label: "SOP Update Request",
    description: "Request changes or additions to SOPs",
    icon: FileEdit,
  },
  {
    value: "it_access",
    label: "IT / Access Request",
    description: "Request system access or IT support",
    icon: Monitor,
  },
  {
    value: "hr",
    label: "HR Request",
    description: "HR-related requests and inquiries",
    icon: Users,
  },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  completed: "bg-green-500/10 text-green-500 border-green-500/30",
  rejected: "bg-red-500/10 text-red-500 border-red-500/30",
};

export default function Requests() {
  const { user } = useAuth();
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: myRequests, refetch } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !type || !title.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("requests").insert({
        type,
        title: title.trim(),
        description: description.trim() || null,
        submitted_by: user.id,
      });

      if (error) throw error;

      toast.success("Request submitted successfully!");
      setSubmitted(true);
      setType("");
      setTitle("");
      setDescription("");
      refetch();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Forms & Requests</h1>
              <p className="text-muted-foreground text-sm">
                Submit requests for SOP updates, IT access, or HR inquiries
              </p>
            </div>
          </div>
        </header>

        {/* Request Form */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Submit a Request</h2>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Request Submitted!</h3>
              <p className="text-muted-foreground">We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                {requestTypes.map((reqType) => (
                  <button
                    key={reqType.value}
                    type="button"
                    onClick={() => setType(reqType.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      type === reqType.value
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-card/50 hover:border-border"
                    }`}
                  >
                    <reqType.icon
                      className={`w-5 h-5 mb-2 ${
                        type === reqType.value ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <p className="font-medium text-foreground text-sm">{reqType.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{reqType.description}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Subject</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your request"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide additional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <Button type="submit" variant="neon" disabled={!type || !title.trim() || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          )}
        </div>

        {/* My Requests */}
        {myRequests && myRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">My Requests</h2>
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-xl bg-card border border-border/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{request.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.description || "No description provided"}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[request.status]}>
                      {request.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
