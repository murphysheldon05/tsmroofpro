import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCreateNewHire } from "@/hooks/useNewHires";
import { useTools } from "@/hooks/useTools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, Send } from "lucide-react";

interface NewHireFormProps {
  onSuccess?: () => void;
}

export function NewHireForm({ onSuccess }: NewHireFormProps) {
  const { user } = useAuth();
  const { data: tools } = useTools();
  const createNewHire = useCreateNewHire();
  
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [submitterName, setSubmitterName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (data?.full_name) {
        setSubmitterName(data.full_name);
      }
    };
    fetchProfile();
  }, [user]);

  // Group tools by category
  const toolsByCategory = tools?.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof tools>) || {};

  const toggleAccess = (toolName: string) => {
    setSelectedAccess(prev =>
      prev.includes(toolName)
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !personalEmail.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }

    try {
      await createNewHire.mutateAsync({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        personal_email: personalEmail.trim(),
        required_access: selectedAccess,
        notes: notes.trim() || undefined,
      });

      // Send notification to HR
      setSendingNotification(true);
      try {
        await supabase.functions.invoke("notify-new-hire", {
          body: {
            newHireName: fullName.trim(),
            personalEmail: personalEmail.trim(),
            phoneNumber: phoneNumber.trim(),
            requiredAccess: selectedAccess,
            submittedByName: submitterName || user?.email || "Unknown",
          },
        });
      } catch (notifyError) {
        console.error("Failed to send HR notification:", notifyError);
        // Don't fail the submission if notification fails
      }
      setSendingNotification(false);

      // Reset form
      setFullName("");
      setPhoneNumber("");
      setPersonalEmail("");
      setNotes("");
      setSelectedAccess([]);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting new hire:", error);
    }
  };

  const isSubmitting = createNewHire.isPending || sendingNotification;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Submit New Hire
        </CardTitle>
        <CardDescription>
          Enter the new hire's information and select the access they need
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalEmail">Personal Email *</Label>
              <Input
                id="personalEmail"
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="personal@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-3">
            <Label>Required Access / Systems</Label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                <div key={category} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{category}</p>
                  <div className="space-y-1">
                    {categoryTools?.map((tool) => (
                      <div key={tool.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={tool.id}
                          checked={selectedAccess.includes(tool.name)}
                          onCheckedChange={() => toggleAccess(tool.name)}
                        />
                        <label
                          htmlFor={tool.id}
                          className="text-sm cursor-pointer"
                        >
                          {tool.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {(!tools || tools.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No tools configured. Add tools in the Admin panel first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information for HR..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit New Hire
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
