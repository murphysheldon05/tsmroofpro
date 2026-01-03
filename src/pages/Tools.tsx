import { AppLayout } from "@/components/layout/AppLayout";
import { ExternalLink, Wrench } from "lucide-react";

const tools = [
  {
    name: "AccuLynx",
    description: "Project management and CRM for roofing contractors",
    url: "https://www.acculynx.com/",
    category: "Project Management",
  },
  {
    name: "CompanyCam",
    description: "Photo documentation and collaboration app",
    url: "https://www.companycam.com/",
    category: "Documentation",
  },
  {
    name: "Xactimate",
    description: "Estimating software for insurance claims",
    url: "https://www.xactware.com/",
    category: "Estimating",
  },
  {
    name: "EagleView",
    description: "Aerial roof measurement reports",
    url: "https://www.eagleview.com/",
    category: "Measurements",
  },
  {
    name: "Roofr",
    description: "Instant roof measurements and proposals",
    url: "https://www.roofr.com/",
    category: "Measurements",
  },
  {
    name: "Microsoft 365",
    description: "Outlook, Teams, and productivity apps",
    url: "https://www.office.com/",
    category: "Productivity",
  },
];

export default function Tools() {
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <a
              key={tool.name}
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
        </div>
      </div>
    </AppLayout>
  );
}
