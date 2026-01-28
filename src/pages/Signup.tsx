import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowLeft, ShieldAlert, Mail } from "lucide-react";

/**
 * GOVERNANCE: Invite-only signup.
 * Self-registration is disabled. Only admin-created invites allow account creation.
 */
export default function Signup() {
  const navigate = useNavigate();

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

      {/* Body */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" className="justify-center mb-8" />

          <div className="glass-card rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Invite Only
            </h1>
            <p className="text-muted-foreground mb-6">
              The TSM Roofing Hub is available by invitation only. If you've
              received an invite email, use the <strong>Sign In</strong> button
              to access your account.
            </p>

            <div className="space-y-4 text-left mb-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Need access?</p>
                  <p className="text-xs text-muted-foreground">
                    Contact your manager or email{" "}
                    <a
                      href="mailto:sheldonmurphy@tsmroofs.com"
                      className="text-primary hover:underline"
                    >
                      sheldonmurphy@tsmroofs.com
                    </a>{" "}
                    to request an invite.
                  </p>
                </div>
              </div>
            </div>

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
