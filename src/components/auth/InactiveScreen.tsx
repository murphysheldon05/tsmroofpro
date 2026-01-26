import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InactiveScreen() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--muted)/0.15)_0%,_transparent_50%)]" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" className="justify-center mb-8" />
          
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Account Inactive
              </h1>
              <p className="text-muted-foreground">
                Your account has been deactivated. Please contact your administrator if you need access restored.
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
