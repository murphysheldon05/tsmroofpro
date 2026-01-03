import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Shield, FileText, Users } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.1)_0%,_transparent_50%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Logo size="md" />
          <Button onClick={() => navigate("/auth")} variant="neon">
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Internal Employee Portal</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="text-foreground">Your Central Hub for</span>
            <br />
            <span className="gradient-text">Everything TSM</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Access SOPs, training resources, templates, and company information all in one place. 
            Built for the TSM Roofing team.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button onClick={() => navigate("/auth")} variant="neon" size="xl">
              Access Portal
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 max-w-5xl mx-auto">
          {[
            {
              icon: FileText,
              title: "SOPs & Documentation",
              description: "Access all standard operating procedures organized by department.",
            },
            {
              icon: Users,
              title: "Training Resources",
              description: "Role-based training tracks and video tutorials for continuous learning.",
            },
            {
              icon: Shield,
              title: "Secure Access",
              description: "Role-based permissions ensure you see what's relevant to you.",
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-6 hover-lift animate-slide-up"
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TSM Roofing LLC. Phoenix, AZ. Internal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}
