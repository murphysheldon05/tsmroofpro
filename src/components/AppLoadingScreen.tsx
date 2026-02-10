import { Logo } from "@/components/Logo";

export function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <div className="animate-pulse">
        <Logo size="lg" />
      </div>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
