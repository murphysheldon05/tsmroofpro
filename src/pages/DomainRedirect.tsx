import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { getCanonicalUrl } from "@/lib/domainRedirect";

/**
 * DomainRedirect - Friendly redirect page for users on wrong domain
 * 
 * Shows TSM branding and a clear message while redirecting to the canonical domain.
 * This provides visual feedback so users understand they're being redirected
 * rather than seeing a confusing blank screen or "Access Denied" error.
 */
export default function DomainRedirect() {
  useEffect(() => {
    // Redirect after a brief delay to show the message
    const timer = setTimeout(() => {
      const canonicalUrl = getCanonicalUrl();
      console.log(`[DomainRedirect] Redirecting to ${canonicalUrl}`);
      window.location.replace(canonicalUrl);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* TSM Logo for brand trust */}
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Main message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Redirecting to TSM Hub...
          </h1>
          <p className="text-muted-foreground">
            Please wait while we redirect you to the correct site.
          </p>
        </div>

        {/* Loading spinner */}
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>

        {/* Manual link fallback */}
        <p className="text-sm text-muted-foreground">
          If you're not redirected automatically,{" "}
          <a 
            href="https://hub.tsmroofs.com" 
            className="text-primary underline hover:text-primary/80"
          >
            click here
          </a>
          .
        </p>
      </div>
    </div>
  );
}
