import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/command-center";

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-8">
          {!isHome && (
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/command-center")}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground capitalize">
                {location.pathname.split("/").filter(Boolean).join(" / ").replace(/-/g, " ")}
              </span>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
