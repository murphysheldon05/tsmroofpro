import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesLeaderboard, useLeaderboardSetting, useLatestCompletedPayRun, usePayRunLeaderboard, usePersonalCommissionStats, LeaderboardTab, TimeRange } from "@/hooks/useSalesLeaderboard";
import { Trophy, Calendar, ExternalLink, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { format, startOfMonth, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

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
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return <span className="text-[11px] font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

function getBarColor(rank: number, tab: LeaderboardTab) {
  if (tab === "sales") return rank === 1 ? "bg-amber-500" : rank <= 3 ? "bg-amber-400" : "bg-amber-300/70";
  if (tab === "profit") return rank === 1 ? "bg-emerald-500" : rank <= 3 ? "bg-emerald-400" : "bg-emerald-300/70";
  return rank === 1 ? "bg-blue-500" : rank <= 3 ? "bg-blue-400" : "bg-blue-300/70";
}

function getAvatarColor(tab: LeaderboardTab, repColor?: string) {
  if (repColor) return "";
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

export function SalesLeaderboardWidget() {
  const { isAdmin, user } = useAuth();
  const { data: isEnabled, isLoading: settingLoading } = useLeaderboardSetting();
  const { data: showProfit } = useLeaderboardSetting("show_profit_on_leaderboard");
  const [tab, setTab] = useState<LeaderboardTab>("commissions");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [customStart, setCustomStart] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Latest completed pay run for commissions/profit tabs
  const { data: latestPayRun } = useLatestCompletedPayRun();
  const { data: payRunEntries, isLoading: payRunLoading } = usePayRunLeaderboard(
    tab === "profit" ? "profit" : "commissions",
    (tab === "commissions" || tab === "profit") ? latestPayRun?.id || null : null
  );

  // Sales tab uses AccuLynx
  const { data: salesResult, isLoading: salesLoading } = useSalesLeaderboard("sales", timeRange, customStart, customEnd);

  // Personal stats
  const { data: personalStats } = usePersonalCommissionStats(user?.id);

  // If profit tab is hidden and user was on it, switch to commissions
  useEffect(() => {
    if (showProfit === false && tab === "profit") {
      setTab("commissions");
    }
  }, [showProfit, tab]);

  if (settingLoading) return null;
  if (isEnabled === false) return null;

  const visibleTabs = TAB_CONFIG.filter(t => t.key !== "profit" || showProfit !== false);
  const isCommissionOrProfit = tab === "commissions" || tab === "profit";
  const entries = isCommissionOrProfit ? (payRunEntries || []) : (salesResult?.entries || []);
  const isLoading = isCommissionOrProfit ? payRunLoading : salesLoading;
  const acculynxNotConfigured = salesResult?.acculynxNotConfigured || false;
  const acculynxError = salesResult?.acculynxError || false;

  const maxValue = entries[0]?.total || 1;
  const displayEntries = showAll ? entries : entries.slice(0, 5);
  const hasMore = entries.length > 5;

  const periodLabel = isCommissionOrProfit
    ? latestPayRun
      ? `Commission Run — ${format(parseISO(latestPayRun.run_date), "yyyy-MM-dd")}`
      : "No completed pay runs yet"
    : timeRange === "month" ? format(new Date(), "MMMM yyyy")
    : timeRange === "ytd" ? format(new Date(), "yyyy")
    : timeRange === "week" ? "This Week"
    : `${customStart} — ${customEnd}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-foreground">Sales Leaderboard</h3>
          </div>
          {tab === "sales" && (
            <div className="flex items-center gap-1 text-xs">
              {(["week", "month", "ytd", "custom"] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => { setTimeRange(r); if (r === "custom") setShowDatePicker(true); }}
                  className={cn(
                    "px-2 py-1 rounded-md transition-colors capitalize",
                    timeRange === r ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {r === "ytd" ? "YTD" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0 mt-1.5">
          {visibleTabs.map((t, idx) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setShowAll(false); }}
              className={cn(
                "flex-1 text-center py-1 text-xs font-medium border transition-all",
                idx === 0 && "rounded-l-lg", idx === visibleTabs.length - 1 && "rounded-r-lg", idx > 0 && "border-l-0",
                tab === t.key ? t.activeClass : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{periodLabel}</p>
      </CardHeader>

      <CardContent className="pt-0 pb-3 px-4">
        {tab === "sales" && timeRange === "custom" && showDatePicker && (
          <div className="flex gap-2 mb-2 flex-wrap items-end">
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="text-xs"><Calendar className="w-3 h-3 mr-1" />{customStart}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start"><CalendarPicker mode="single" selected={new Date(customStart)} onSelect={(d) => d && setCustomStart(format(d, "yyyy-MM-dd"))} className="pointer-events-auto" /></PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="text-xs"><Calendar className="w-3 h-3 mr-1" />{customEnd}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start"><CalendarPicker mode="single" selected={new Date(customEnd)} onSelect={(d) => d && setCustomEnd(format(d, "yyyy-MM-dd"))} className="pointer-events-auto" /></PopoverContent>
            </Popover>
          </div>
        )}

        {tab === "sales" && acculynxNotConfigured ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-muted-foreground text-sm">Connect AccuLynx to see live sales data.</p>
            {isAdmin && <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" />Go to Admin Panel</Link>}
          </div>
        ) : tab === "sales" && acculynxError ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-muted-foreground text-sm">Unable to load AccuLynx data. Check Admin Panel &gt; Integrations.</p>
            {isAdmin && <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="w-3 h-3" />Go to Admin Panel</Link>}
          </div>
        ) : isCommissionOrProfit && !latestPayRun ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No completed pay runs yet.</div>
        ) : isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="flex items-center gap-2"><Skeleton className="w-5 h-5 rounded-full" /><Skeleton className="w-7 h-7 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-2 w-full" /></div></div>)}</div>
        ) : !entries.length ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No data for this period.</div>
        ) : (
          <>
            <div className="space-y-1">
              {displayEntries.map((entry, idx) => {
                const rank = idx + 1;
                const barWidth = maxValue > 0 ? (entry.total / maxValue) * 100 : 0;
                const isTopThree = rank <= 3;
                return (
                  <div key={entry.repId} className={cn("flex items-center gap-1.5 py-1.5 px-2 rounded-lg transition-colors", isTopThree && "bg-muted/50")}>
                    <RankBadge rank={rank} />
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full font-semibold shrink-0",
                        isTopThree ? "w-7 h-7 text-[10px]" : "w-6 h-6 text-[9px]",
                        getAvatarColor(tab, entry.repColor)
                      )}
                      style={entry.repColor ? { backgroundColor: entry.repColor, color: "white" } : undefined}
                    >
                      {getInitials(entry.repName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn("truncate", isTopThree ? "text-xs font-semibold text-foreground" : "text-[11px] text-muted-foreground")}>{entry.repName}</span>
                        <span className={cn("font-mono shrink-0", isTopThree ? "text-xs font-bold text-foreground" : "text-[11px] text-muted-foreground")}><AnimatedNumber value={entry.total} /></span>
                      </div>
                      <div className="h-1.5 mt-0.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700 ease-out", getBarColor(rank, tab))} style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <button onClick={() => setShowAll(!showAll)} className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-2 py-1">
                {showAll ? <><ChevronUp className="w-3 h-3" />Show Top 5</> : <><ChevronDown className="w-3 h-3" />View All ({entries.length})</>}
              </button>
            )}
          </>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 text-right">Last updated: {format(new Date(), "h:mm a")}</p>

        {/* Personal Commission Stats */}
        {personalStats?.hasLinkedRep && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/40">
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground font-medium">Submitted</div>
              <div className="text-sm font-bold">{formatCurrency(personalStats.submitted)}</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground font-medium">Approved</div>
              <div className="text-sm font-bold">{formatCurrency(personalStats.approved)}</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground font-medium">YTD Paid</div>
              <div className="text-sm font-bold text-emerald-600">{formatCurrency(personalStats.ytdPaid)}</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground font-medium">Draw Balance</div>
              <div className={cn("text-sm font-bold", personalStats.drawBalance < 0 ? "text-red-600" : "text-foreground")}>
                {formatCurrency(personalStats.drawBalance)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
