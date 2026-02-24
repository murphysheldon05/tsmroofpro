import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Please enter your full name"),
  terms: z.boolean().refine((val) => val === true, "You must accept the terms"),
});

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Invite validation state
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteData, setInviteData] = useState<{ full_name?: string } | null>(null);

  const { signUp, user, loading, isActive } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in and active, redirect to command center
    if (!loading && user && isActive) {
      navigate("/command-center", { replace: true });
    }
  }, [user, loading, isActive, navigate]);

  // Check if email has a valid invite when email changes
  useEffect(() => {
    const checkInvite = async () => {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        setInviteValid(null);
        setInviteData(null);
        return;
      }

      setIsCheckingInvite(true);
      try {
        const { data, error } = await supabase
          .from("pending_invites")
          .select("id, email, full_name")
          .eq("email", trimmedEmail)
          .maybeSingle();

        if (error) {
          console.error("Error checking invite:", error);
          setInviteValid(false);
          setInviteData(null);
        } else if (data) {
          setInviteValid(true);
          setInviteData({ full_name: data.full_name || undefined });
          // Pre-fill name if provided in invite
          if (data.full_name && !fullName) {
            setFullName(data.full_name);
          }
        } else {
          setInviteValid(false);
          setInviteData(null);
        }
      } catch (err) {
        console.error("Invite check failed:", err);
        setInviteValid(false);
      } finally {
        setIsCheckingInvite(false);
      }
    };

    const debounce = setTimeout(checkInvite, 500);
    return () => clearTimeout(debounce);
  }, [email]);

  const validateForm = () => {
    try {
      signupSchema.parse({ email, password, fullName, terms: termsAccepted });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for valid invite first
    if (!inviteValid) {
      toast.error("You need a valid invite to create an account. Contact your administrator.");
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      const { data, error } = await signUp(trimmedEmail, password, fullName);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
      } else {
        // Remove from pending_invites after successful signup
        // This is done server-side via trigger, but we also update link_accessed_at
        await supabase
          .from("pending_invites")
          .update({ link_accessed_at: new Date().toISOString() })
          .eq("email", trimmedEmail);

        // Notify admins of pending approval (fire-and-forget; don't block user flow)
        if (data?.user) {
          supabase.functions
            .invoke("notify-new-signup", {
              body: {
                user_id: data.user.id,
                email: data.user.email ?? trimmedEmail,
                full_name: fullName,
              },
            })
            .catch((err) => console.warn("Admin notification failed:", err));
        }

        setSignupComplete(true);
        toast.success("Account created! Awaiting approval.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <AppLoadingScreen />;
  }

  // Show pending approval message after successful signup
  if (signupComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />

        <header className="relative z-10 p-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
          <div className="w-full max-w-md text-center">
            <Logo size="lg" className="justify-center mb-8" />

            <div className="glass-card rounded-2xl p-8">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2">
                Account Created!
              </h1>
              <p className="text-muted-foreground mb-6">
                Your account has been created and is pending admin approval.
                You'll receive an email once your account is activated.
              </p>

              <Button
                variant="neon"
                className="w-full"
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Go to Sign In
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />

      {/* Header */}
      <header className="relative z-10 p-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      {/* Signup Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Join the TSM Roofing team portal
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@tsmroofing.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${errors.email ? "border-destructive" : ""} ${inviteValid === true ? "border-green-500 pr-10" : ""} ${inviteValid === false ? "border-amber-500 pr-10" : ""}`}
                  />
                  {isCheckingInvite && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {!isCheckingInvite && inviteValid === true && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {!isCheckingInvite && inviteValid === false && email.includes("@") && (
                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  )}
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
                {inviteValid === false && email.includes("@") && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    No invite found for this email. Contact your administrator to request access.
                  </p>
                )}
                {inviteValid === true && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Valid invite found
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                <PasswordStrengthIndicator password={password} />
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </Label>
              </div>
              {errors.terms && (
                <p className="text-sm text-destructive">{errors.terms}</p>
              )}

              <Button
                type="submit"
                variant="neon"
                className="w-full"
                size="lg"
                disabled={isSubmitting || inviteValid !== true}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/auth")}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>

            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-center text-xs text-muted-foreground">
                Don't have an invite?{" "}
                <a
                  href="mailto:sheldonmurphy@tsmroofs.com?subject=TSM Hub Access Request"
                  className="text-primary hover:underline"
                >
                  Request access
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
