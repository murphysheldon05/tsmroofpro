import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RejectedScreen() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--destructive)/0.08)_0%,_transparent_50%)]" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" className="justify-center mb-8" />
          
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Access Denied
              </h1>
              <p className="text-muted-foreground">
                Your account request has been reviewed and was not approved. Please contact your administrator if you believe this is an error.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>

            <div className="pt-4 border-t border-border">
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
