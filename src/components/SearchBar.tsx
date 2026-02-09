import { useState, useEffect, useRef } from "react";
import { Search, X, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchResources } from "@/hooks/useResources";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { data: results, isLoading } = useSearchResources(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (url: string | null, categorySlug?: string) => {
    setIsOpen(false);
    setQuery("");
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (categorySlug) {
      navigate(`/playbook-library/${categorySlug}`);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search resources..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 bg-secondary/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="p-2">
              {results.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => handleResultClick(resource.url, resource.categories?.slug)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {resource.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resource.categories?.name || "Uncategorized"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No resources found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
