import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidFlowchartProps {
  chart: string;
  id: string;
}

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

        // Initialize mermaid with concrete colors (CSS variables not supported)
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#3b82f6",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#2563eb",
            lineColor: "#6b7280",
            secondaryColor: "#e5e7eb",
            tertiaryColor: "#f3f4f6",
            background: "#ffffff",
            mainBkg: "#f9fafb",
            nodeBorder: "#d1d5db",
            clusterBkg: "#f3f4f6",
            titleColor: "#111827",
            edgeLabelBackground: "#ffffff",
            textColor: "#374151",
            nodeTextColor: "#374151",
          },
          flowchart: {
            htmlLabels: true,
            curve: "basis",
            padding: 15,
          },
          securityLevel: "loose",
        });

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
