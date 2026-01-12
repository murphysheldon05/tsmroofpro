import { AppLayout } from "@/components/layout/AppLayout";
import { ExternalLink, Wrench, Loader2, Smartphone, GraduationCap } from "lucide-react";
import { useTools } from "@/hooks/useTools";
import { Button } from "@/components/ui/button";

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
              <div
                key={tool.id}
                className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {tool.name.charAt(0)}
                    </span>
                  </div>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <span className="text-xs text-primary font-medium">{tool.category}</span>
                <h3 className="font-semibold text-foreground mt-1">
                  {tool.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">{tool.description}</p>
                
                {/* Action Links */}
                {(tool.ios_app_url || tool.android_app_url || tool.training_url) && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                    {tool.training_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <a
                          href={tool.training_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <GraduationCap className="w-3 h-3 mr-1" />
                          Training Resources
                        </a>
                      </Button>
                    )}
                    {tool.ios_app_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 min-w-[100px]"
                      >
                        <a
                          href={tool.ios_app_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Smartphone className="w-3 h-3 mr-1" />
                          iOS App
                        </a>
                      </Button>
                    )}
                    {tool.android_app_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 min-w-[100px]"
                      >
                        <a
                          href={tool.android_app_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Smartphone className="w-3 h-3 mr-1" />
                          Android
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
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
