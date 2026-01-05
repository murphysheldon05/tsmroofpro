import { AppLayout } from "@/components/layout/AppLayout";
import { ExternalLink, Wrench, Loader2 } from "lucide-react";
import { useTools } from "@/hooks/useTools";

export default function Tools() {
  const { data: tools, isLoading } = useTools();

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tools & Systems</h1>
              <p className="text-muted-foreground text-sm">
                Quick access to all the tools you use daily
              </p>
            </div>
          </div>
        </header>

        {/* Tools Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools?.map((tool) => (
              <a
                key={tool.id}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all hover-lift"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {tool.name.charAt(0)}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-primary font-medium">{tool.category}</span>
                <h3 className="font-semibold text-foreground mt-1 group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{tool.description}</p>
              </a>
            ))}
            {(!tools || tools.length === 0) && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No tools configured yet. Contact an administrator to add tools.
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}