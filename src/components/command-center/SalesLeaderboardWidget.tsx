import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesLeaderboard, useLeaderboardSetting, LeaderboardTab, TimeRange } from "@/hooks/useSalesLeaderboard";
import { Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

function AnimatedNumber({ value, prefix = "$" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    if (ref.current) cancelAnimationFrame(ref.current);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };

    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return <span>{prefix}{display.toLocaleString()}</span>;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-xs font-bold text-muted-foreground w-6 text-center">{rank}</span>;
}

function getBarColor(rank: number, tab: LeaderboardTab) {
  if (tab === "sales") {
    if (rank === 1) return "bg-amber-500";
    if (rank <= 3) return "bg-amber-400";
    return "bg-amber-300/70";
  }
  if (tab === "profit") {
    if (rank === 1) return "bg-emerald-500";
    if (rank <= 3) return "bg-emerald-400";
    return "bg-emerald-300/70";
  }
  if (rank === 1) return "bg-blue-500";
  if (rank <= 3) return "bg-blue-400";
  return "bg-blue-300/70";
}

function getAvatarColor(tab: LeaderboardTab) {
  if (tab === "sales") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (tab === "profit") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const TAB_CONFIG: { key: LeaderboardTab; label: string; activeClass: string }[] = [
  { key: "sales", label: "Sales", activeClass: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400" },
  { key: "profit", label: "Profit", activeClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
  { key: "commissions", label: "Commissions", activeClass: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400" },
];

const TAB_LABELS: Record<LeaderboardTab, string> = {
  sales: "Sales Volume",
  profit: "Profit",
  commissions: "Commissions",
};

export function SalesLeaderboardWidget() {
  const { data: isEnabled, isLoading: settingLoading } = useLeaderboardSetting();
  const [tab, setTab] = useState<LeaderboardTab>("sales");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [customStart, setCustomStart] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: entries, isLoading } = useSalesLeaderboard(tab, timeRange, customStart, customEnd);

  if (settingLoading) return null;
  if (isEnabled === false) return null;

  const maxValue = entries?.[0]?.total || 1;

  const periodLabel = timeRange === "month"
    ? format(new Date(), "MMMM yyyy")
    : timeRange === "ytd"
    ? format(new Date(), "yyyy")
    : timeRange === "week"
    ? "This Week"
    : `${customStart} — ${customEnd}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-foreground">Sales Leaderboard</h3>
          </div>
          {/* Time Range */}
          <div className="flex items-center gap-1 text-xs">
            {(["week", "month", "ytd", "custom"] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => {
                  setTimeRange(r);
                  if (r === "custom") setShowDatePicker(true);
                }}
                className={cn(
                  "px-2 py-1 rounded-md transition-colors capitalize",
                  timeRange === r
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {r === "ytd" ? "YTD" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 3-tab toggle: Sales | Profit | Commissions */}
        <div className="flex items-center gap-0 mt-2">
          {TAB_CONFIG.map((t, idx) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 text-center py-1.5 text-sm font-medium border transition-all",
                idx === 0 && "rounded-l-lg",
                idx === TAB_CONFIG.length - 1 && "rounded-r-lg",
                idx > 0 && "border-l-0",
                tab === t.key
                  ? t.activeClass
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {TAB_LABELS[tab]} — {periodLabel}
        </p>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {/* Custom date picker */}
        {timeRange === "custom" && showDatePicker && (
          <div className="flex gap-2 mb-3 flex-wrap items-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {customStart}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <CalendarPicker
                  mode="single"
                  selected={new Date(customStart)}
                  onSelect={(d) => d && setCustomStart(format(d, "yyyy-MM-dd"))}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {customEnd}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <CalendarPicker
                  mode="single"
                  selected={new Date(customEnd)}
                  onSelect={(d) => d && setCustomEnd(format(d, "yyyy-MM-dd"))}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !entries?.length ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No data for this period. Commissions will appear here as they're approved.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const barWidth = maxValue > 0 ? (entry.total / maxValue) * 100 : 0;
              const isTopThree = rank <= 3;

              return (
                <div
                  key={entry.repId}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors",
                    isTopThree && "bg-muted/50"
                  )}
                >
                  <RankBadge rank={rank} />

                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full font-semibold text-xs shrink-0",
                      isTopThree ? "w-9 h-9" : "w-7 h-7",
                      getAvatarColor(tab)
                    )}
                  >
                    {getInitials(entry.repName)}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "truncate",
                        isTopThree ? "text-sm font-semibold text-foreground" : "text-xs text-muted-foreground"
                      )}>
                        {entry.repName}
                      </span>
                      <span className={cn(
                        "font-mono shrink-0",
                        isTopThree ? "text-sm font-bold text-foreground" : "text-xs text-muted-foreground"
                      )}>
                        <AnimatedNumber value={entry.total} />
                      </span>
                    </div>
                    <div className="h-2 mt-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700 ease-out", getBarColor(rank, tab))}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-3 text-right">
          Last updated: {format(new Date(), "h:mm a")}
        </p>
      </CardContent>
    </Card>
  );
}
