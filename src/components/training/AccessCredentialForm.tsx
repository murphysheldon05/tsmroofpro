import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Mail, Key, Eye, EyeOff, Check, Send } from "lucide-react";
import { useNewHireAccessCredentials, useUpsertAccessCredential, NewHireAccessCredential } from "@/hooks/useNewHireAccessCredentials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AccessCredentialFormProps {
  newHireId: string;
  newHireName: string;
  requiredAccess: string[];
  submittedBy: string;
}

export function AccessCredentialForm({ newHireId, newHireName, requiredAccess, submittedBy }: AccessCredentialFormProps) {
  const { data: existingCredentials, isLoading } = useNewHireAccessCredentials(newHireId);
  const upsertCredential = useUpsertAccessCredential();
  const [isSending, setIsSending] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getExistingCredential = (accessType: string): NewHireAccessCredential | undefined => {
    return existingCredentials?.find(c => c.access_type === accessType);
  };

  const allCredentialsComplete = requiredAccess.every(access => {
    const cred = getExistingCredential(access);
    return cred && (cred.email || cred.invite_sent);
  });

  const handleSendToSubmitter = async () => {
    if (!existingCredentials || existingCredentials.length === 0) {
      toast.error("Please save at least one credential first");
      return;
    }

    setIsSending(true);
    try {
      const credentials = existingCredentials.map(cred => ({
        accessType: cred.access_type,
        email: cred.email,
        password: cred.password,
        inviteSent: cred.invite_sent,
        notes: cred.notes,
      }));

      const { data, error } = await supabase.functions.invoke('send-credentials-to-submitter', {
        body: {
          newHireId,
          newHireName,
          submitterId: submittedBy,
          credentials,
        },
      });

      if (error) throw error;

      toast.success(`Credentials sent to the manager who requested this new hire`);
    } catch (error: any) {
      console.error("Error sending credentials:", error);
      toast.error("Failed to send credentials: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3 mt-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground">Access Credentials for {newHireName}</h4>
        {existingCredentials && existingCredentials.length > 0 && (
          <Button
            size="sm"
            variant={allCredentialsComplete ? "default" : "outline"}
            onClick={handleSendToSubmitter}
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Send className="w-3 h-3 mr-1" />
            )}
            Send to Requester
          </Button>
        )}
      </div>
      <div className="grid gap-3">
        {requiredAccess.map((access) => (
          <AccessItemForm
            key={access}
            newHireId={newHireId}
            accessType={access}
            existingCredential={getExistingCredential(access)}
            onSave={upsertCredential.mutate}
            isSaving={upsertCredential.isPending}
          />
        ))}
      </div>
      
      {/* General Notes Section */}
      <GeneralNotesSection newHireId={newHireId} existingCredentials={existingCredentials} onSave={upsertCredential.mutate} isSaving={upsertCredential.isPending} />
    </div>
  );
}

interface AccessItemFormProps {
  newHireId: string;
  accessType: string;
  existingCredential?: NewHireAccessCredential;
  onSave: (data: {
    new_hire_id: string;
    access_type: string;
    email?: string;
    password?: string;
    invite_sent?: boolean;
    notes?: string;
  }) => void;
  isSaving: boolean;
}

function AccessItemForm({ newHireId, accessType, existingCredential, onSave, isSaving }: AccessItemFormProps) {
  const [email, setEmail] = useState(existingCredential?.email || "");
  const [password, setPassword] = useState(existingCredential?.password || "");
  const [inviteSent, setInviteSent] = useState(existingCredential?.invite_sent || false);
  const [notes, setNotes] = useState(existingCredential?.notes || "");
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(!existingCredential);

  useEffect(() => {
    if (existingCredential) {
      setEmail(existingCredential.email || "");
      setPassword(existingCredential.password || "");
      setInviteSent(existingCredential.invite_sent || false);
      setNotes(existingCredential.notes || "");
    }
  }, [existingCredential]);

  const handleSave = () => {
    onSave({
      new_hire_id: newHireId,
      access_type: accessType,
      email: email || undefined,
      password: password || undefined,
      invite_sent: inviteSent,
      notes: notes || undefined,
    });
    setIsEditing(false);
  };

  const isComplete = existingCredential && (existingCredential.email || existingCredential.invite_sent);

  if (!isEditing && existingCredential) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isComplete ? "default" : "secondary"} className="flex items-center gap-1">
                {isComplete && <Check className="w-3 h-3" />}
                {accessType}
              </Badge>
              {existingCredential.invite_sent && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Invite sent
                </span>
              )}
              {existingCredential.email && (
                <span className="text-xs text-muted-foreground">
                  {existingCredential.email}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
          {existingCredential.notes && (
            <p className="text-xs text-muted-foreground mt-2">{existingCredential.notes}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Badge variant="outline">{accessType}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 px-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`email-${accessType}`} className="text-xs flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </Label>
            <Input
              id={`email-${accessType}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`password-${accessType}`} className="text-xs flex items-center gap-1">
              <Key className="w-3 h-3" /> Password
            </Label>
            <div className="relative">
              <Input
                id={`password-${accessType}`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-8 text-sm pr-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`invite-${accessType}`}
            checked={inviteSent}
            onCheckedChange={(checked) => setInviteSent(checked === true)}
          />
          <Label htmlFor={`invite-${accessType}`} className="text-xs">
            Invite sent to tsmroofs.com email
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`notes-${accessType}`} className="text-xs">
            Notes
          </Label>
          <Textarea
            id={`notes-${accessType}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="min-h-[60px] text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          {existingCredential && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface GeneralNotesSectionProps {
  newHireId: string;
  existingCredentials?: NewHireAccessCredential[];
  onSave: (data: {
    new_hire_id: string;
    access_type: string;
    email?: string;
    password?: string;
    invite_sent?: boolean;
    notes?: string;
  }) => void;
  isSaving: boolean;
}

function GeneralNotesSection({ newHireId, existingCredentials, onSave, isSaving }: GeneralNotesSectionProps) {
  const generalNotes = existingCredentials?.find(c => c.access_type === '__general_notes__');
  const [notes, setNotes] = useState(generalNotes?.notes || "");
  const [isEditing, setIsEditing] = useState(!generalNotes);

  useEffect(() => {
    if (generalNotes) {
      setNotes(generalNotes.notes || "");
    }
  }, [generalNotes]);

  const handleSave = () => {
    onSave({
      new_hire_id: newHireId,
      access_type: '__general_notes__',
      notes: notes || undefined,
    });
    setIsEditing(false);
  };

  if (!isEditing && generalNotes?.notes) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Additional Notes</p>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{generalNotes.notes}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Additional Notes</CardTitle>
      </CardHeader>
      <CardContent className="py-3 px-4 space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="General notes about this new hire's onboarding..."
          className="min-h-[80px] text-sm"
        />
        <div className="flex justify-end gap-2">
          {generalNotes && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
            Save Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
