import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminAuditLog, AUDIT_ACTIONS, OBJECT_TYPES } from "@/hooks/useAdminAuditLog";

interface ResetPasswordDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function ResetPasswordDialog({ userId, userName, userEmail }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { logAction } = useAdminAuditLog();

  const validatePassword = (pwd: string) => {
    const PASSWORD_MIN_LENGTH = 12;
    const errors: string[] = [];

    if (pwd.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      errors.push("Password must contain at least one special character");
    }

    return errors;
  };

  const generatePassword = () => {
    // Generate a strong temp password (12+ chars, includes upper/lower/number/special)
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const nums = "23456789";
    const specials = "!@#$%&*";
    const all = upper + lower + nums + specials;

    const pick = (s: string) => s.charAt(Math.floor(Math.random() * s.length));
    const chars: string[] = [pick(upper), pick(lower), pick(nums), pick(specials)];
    while (chars.length < 14) chars.push(pick(all));

    // shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const pwd = chars.join("");
    setPassword(pwd);
    setShowPassword(true);
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Password copied to clipboard");
  };

  const handleSubmit = async () => {
    if (!password) {
      toast.error("Please enter a password");
      return;
    }

    const pwErrors = validatePassword(password);
    if (pwErrors.length) {
      toast.error(pwErrors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invite", {
        body: { 
          user_id: userId, 
          new_password: password 
        },
      });

      if (error) throw error;

      // Audit log
      logAction.mutate({
        action_type: AUDIT_ACTIONS.PASSWORD_RESET,
        object_type: OBJECT_TYPES.USER,
        object_id: userId,
        new_value: { email: userEmail },
        notes: `Password reset for ${userName || userEmail}`,
      });

      toast.success(
        `Temporary password set for ${userName || userEmail}. ${data?.email_sent ? "Email sent." : "Email not sent—check notification settings."}`
      );
      setOpen(false);
      setPassword("");
    } catch (error: any) {
      toast.error("Failed to reset password: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        setPassword("");
        setShowPassword(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password">
          <KeyRound className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Temporary Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium">{userName || "—"}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>

          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {password && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  title="Copy password"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={generatePassword}
            className="w-full"
          >
            Generate Secure Password
          </Button>

          <p className="text-xs text-muted-foreground">
            This sets a temporary password and emails it to the user.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !password}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
