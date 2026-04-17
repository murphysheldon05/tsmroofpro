import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Loader2, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { z } from "zod";
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

  const { signIn, user, loading, isActive } = useAuth();
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

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Ambient background wash using design tokens */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: "var(--gradient-dark)" }}
      />
      <div
        aria-hidden
        className="fixed -top-48 -right-48 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="fixed -bottom-32 -left-32 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--info) / 0.08), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[540px] h-[540px] rounded-full blur-3xl pointer-events-none animate-[pulse_9s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, hsl(var(--highlight) / 0.1), transparent 68%)" }}
      />

      {/* Header */}
      <header className="relative z-10 p-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm hover:bg-accent/60">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      {/* Auth Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[440px] animate-fade-in">
          {/* Hero */}
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-6" />
            <h1 className="text-4xl font-extrabold text-foreground mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground mb-4">
              Sign in to access the employee portal
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Secure
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-[hsl(var(--info))]" />
                Fast updates
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--highlight))]" />
                Built for crews
              </div>
            </div>
          </div>

          {/* Login card */}
          <div className="relative group">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px rounded-2xl blur-sm opacity-65 transition-opacity duration-500 group-hover:opacity-95"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary) / 0.45), hsl(var(--info) / 0.35), hsl(var(--highlight) / 0.35))",
              }}
            />
            <div className="glass-card relative rounded-2xl p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="section-label">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@tsmroofing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="section-label">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline font-semibold"
                    onClick={() => toast.info("Contact your administrator to reset your password.")}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
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
              </div>

              <Button
                type="submit"
                variant="neon"
                size="lg"
                className="w-full shadow-[0_0_28px_hsl(var(--primary)/0.32)] hover:scale-[1.01] active:scale-[0.995]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Got an invite?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary hover:underline font-semibold"
              >
                Create your account
              </button>
            </p>

            <div className="mt-6 pt-4 border-t border-border/40 text-center">
              <p className="text-xs text-muted-foreground">
                © 2026 TSM Roofing LLC • Phoenix & Prescott, AZ
              </p>
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
