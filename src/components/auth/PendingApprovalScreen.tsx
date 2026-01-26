import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PendingApprovalScreen() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" className="justify-center mb-8" />
          
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Pending Approval
              </h1>
              <p className="text-muted-foreground">
                Your account is awaiting admin approval. You'll receive an email notification once your access has been granted.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-4">
                If you believe this is an error or need immediate access, please contact your administrator.
              </p>
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
