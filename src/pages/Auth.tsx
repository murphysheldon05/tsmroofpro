import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { PendingApprovalScreen } from "@/components/auth/PendingApprovalScreen";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, user, loading, isActive, employeeStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && isActive) {
      navigate("/command-center", { replace: true });
    }
  }, [user, loading, isActive, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
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
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Welcome back!");
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

  if (user && employeeStatus === 'pending') {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* B1: Warm gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[hsl(142_76%_96%)] via-[hsl(220_20%_97%)] to-[hsl(213_60%_96%)]" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_hsl(142_72%_35%/0.05)_0%,_transparent_70%)]" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_hsl(213_60%_50%/0.04)_0%,_transparent_70%)]" />

      {/* Dark mode overrides */}
      <div className="dark:hidden" />
      <style>{`
        .dark .auth-bg { background: hsl(222 47% 5%); }
        .dark .auth-bg .auth-gradient-1 { background: radial-gradient(ellipse at top right, hsl(142 71% 45% / 0.06) 0%, transparent 70%); }
        .dark .auth-bg .auth-gradient-2 { background: radial-gradient(ellipse at bottom left, hsl(213 60% 50% / 0.04) 0%, transparent 70%); }
      `}</style>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      {/* Auth Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[420px]">
          {/* A1: Logo hero */}
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Sign in to access the employee portal
            </p>
          </div>

          {/* B2: Login card with premium styling */}
          <div className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-[20px] px-10 py-10 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@tsmroofing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`rounded-[10px] transition-all focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-[hsl(220_9%_64%)] ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
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
                    className={`rounded-[10px] pr-10 transition-all focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-[hsl(220_9%_64%)] ${errors.password ? "border-destructive" : ""}`}
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
                {/* B5: Forgot password link */}
                <div className="text-right">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline font-medium"
                    onClick={() => toast.info("Contact your administrator to reset your password.")}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* B4: Premium sign in button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, hsl(142 72% 35%), hsl(142 72% 28%))",
                  boxShadow: "0 2px 8px hsla(142, 72%, 35%, 0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px hsla(142, 72%, 35%, 0.3)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px hsla(142, 72%, 35%, 0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* B7: Updated create account text */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Got an invite?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary hover:underline font-medium"
              >
                Create your account
              </button>
            </p>

            {/* B6: Footer */}
            <div className="mt-6 pt-4 border-t border-border/30 text-center">
              <p className="text-xs text-muted-foreground">
                © 2026 TSM Roofing LLC • Phoenix & Prescott, AZ
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
