import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidFlowchartProps {
  chart: string;
  id: string;
}

// Initialize mermaid with dark/light mode support
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    primaryColor: "hsl(var(--primary))",
    primaryTextColor: "hsl(var(--primary-foreground))",
    primaryBorderColor: "hsl(var(--border))",
    lineColor: "hsl(var(--muted-foreground))",
    secondaryColor: "hsl(var(--secondary))",
    tertiaryColor: "hsl(var(--muted))",
    background: "hsl(var(--background))",
    mainBkg: "hsl(var(--card))",
    nodeBorder: "hsl(var(--border))",
    clusterBkg: "hsl(var(--muted))",
    titleColor: "hsl(var(--foreground))",
    edgeLabelBackground: "hsl(var(--background))",
    textColor: "hsl(var(--foreground))",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    padding: 15,
  },
  securityLevel: "loose",
});

export function MermaidFlowchart({ chart, id }: MermaidFlowchartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !containerRef.current) return;

      try {
        // Clear any previous content
        setSvg("");
        setError(null);

        // Generate unique ID for this render
        const uniqueId = `mermaid-${id}-${Date.now()}`;
        
        // Render the chart
        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.error("Mermaid rendering error:", err);
        setError("Failed to render flowchart");
      }
    };

    renderChart();
  }, [chart, id]);

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground bg-muted/50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto bg-card/50 rounded-lg p-4 border"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
