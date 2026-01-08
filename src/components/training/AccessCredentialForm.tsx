import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Mail, Key, Eye, EyeOff, Check } from "lucide-react";
import { useNewHireAccessCredentials, useUpsertAccessCredential, NewHireAccessCredential } from "@/hooks/useNewHireAccessCredentials";

interface AccessCredentialFormProps {
  newHireId: string;
  newHireName: string;
  requiredAccess: string[];
}

export function AccessCredentialForm({ newHireId, newHireName, requiredAccess }: AccessCredentialFormProps) {
  const { data: existingCredentials, isLoading } = useNewHireAccessCredentials(newHireId);
  const upsertCredential = useUpsertAccessCredential();

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

  return (
    <div className="space-y-3 mt-4 pt-4 border-t">
      <h4 className="text-sm font-semibold text-muted-foreground">Access Credentials for {newHireName}</h4>
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
            Invite sent to personal email
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
