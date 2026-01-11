import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, FileCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommissionData {
  id: string;
  title: string;
  submitted_by: string;
  created_at: string;
  status: string;
  approval_stage: string | null;
  total_payout_requested: number | null;
  approved_amount: number | null;
  submitter_name: string | null;
}

type TimeRange = "3months" | "6months" | "12months" | "all";

const chartConfig = {
  requested: {
    label: "Requested",
    color: "hsl(var(--primary))",
  },
  approved: {
    label: "Approved",
    color: "hsl(200 100% 50%)",
  },
};

export function CommissionReportDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("6months");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  // Fetch all commission requests with submitter info
  const { data: commissionData, isLoading } = useQuery({
    queryKey: ["commission-reports"],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("requests")
        .select("id, title, submitted_by, created_at, status, approval_stage, total_payout_requested, approved_amount")
        .eq("type", "commission")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get unique submitter IDs
      const submitterIds = [...new Set(requests.map(r => r.submitted_by))];

      // Fetch profiles for all submitters
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", submitterIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return requests.map(r => ({
        ...r,
        submitter_name: profilesMap.get(r.submitted_by) || "Unknown",
      })) as CommissionData[];
    },
  });

  // Get unique employees for filter
  const employees = useMemo(() => {
    if (!commissionData) return [];
    const unique = new Map<string, string>();
    commissionData.forEach(d => {
      if (!unique.has(d.submitted_by)) {
        unique.set(d.submitted_by, d.submitter_name || "Unknown");
      }
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [commissionData]);

  // Filter data based on time range and employee
  const filteredData = useMemo(() => {
    if (!commissionData) return [];

    let startDate: Date;
    const now = new Date();

    switch (timeRange) {
      case "3months":
        startDate = subMonths(now, 3);
        break;
      case "6months":
        startDate = subMonths(now, 6);
        break;
      case "12months":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = new Date(0);
    }

    return commissionData.filter(d => {
      const date = parseISO(d.created_at);
      const matchesDate = date >= startDate;
      const matchesEmployee = selectedEmployee === "all" || d.submitted_by === selectedEmployee;
      return matchesDate && matchesEmployee;
    });
  }, [commissionData, timeRange, selectedEmployee]);

  // Calculate monthly aggregates for charts
  const monthlyData = useMemo(() => {
    if (!filteredData.length) return [];

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "3months":
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case "6months":
        startDate = startOfMonth(subMonths(now, 5));
        break;
      case "12months":
        startDate = startOfMonth(subMonths(now, 11));
        break;
      default:
        if (filteredData.length > 0) {
          startDate = startOfMonth(parseISO(filteredData[0].created_at));
        } else {
          startDate = startOfMonth(subMonths(now, 5));
        }
    }

    const months = eachMonthOfInterval({ start: startDate, end: endOfMonth(now) });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthData = filteredData.filter(d => {
        const date = parseISO(d.created_at);
        return date >= monthStart && date <= monthEnd;
      });

      const requested = monthData.reduce((sum, d) => sum + (d.total_payout_requested || 0), 0);
      const approved = monthData.reduce((sum, d) => sum + (d.approved_amount || 0), 0);

      return {
        month: format(month, "MMM yyyy"),
        requested,
        approved,
        count: monthData.length,
      };
    });
  }, [filteredData, timeRange]);

  // Employee breakdown data
  const employeeData = useMemo(() => {
    if (!filteredData.length) return [];

    const employeeMap = new Map<string, { name: string; requested: number; approved: number; count: number }>();

    filteredData.forEach(d => {
      const existing = employeeMap.get(d.submitted_by) || {
        name: d.submitter_name || "Unknown",
        requested: 0,
        approved: 0,
        count: 0,
      };

      employeeMap.set(d.submitted_by, {
        ...existing,
        requested: existing.requested + (d.total_payout_requested || 0),
        approved: existing.approved + (d.approved_amount || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(employeeMap.values())
      .sort((a, b) => b.requested - a.requested)
      .slice(0, 10);
  }, [filteredData]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalRequested = filteredData.reduce((sum, d) => sum + (d.total_payout_requested || 0), 0);
    const totalApproved = filteredData.reduce((sum, d) => sum + (d.approved_amount || 0), 0);
    const pendingCount = filteredData.filter(d => 
      d.status === "pending" || d.approval_stage === "pending_manager"
    ).length;
    const approvedCount = filteredData.filter(d => 
      d.status === "approved" || d.approval_stage === "manager_approved"
    ).length;
    const approvalRate = filteredData.length > 0 
      ? (approvedCount / filteredData.length) * 100 
      : 0;

    // Calculate trend (compare last month to previous month)
    if (monthlyData.length >= 2) {
      const lastMonth = monthlyData[monthlyData.length - 1];
      const prevMonth = monthlyData[monthlyData.length - 2];
      const trend = prevMonth.requested > 0 
        ? ((lastMonth.requested - prevMonth.requested) / prevMonth.requested) * 100 
        : 0;

      return { totalRequested, totalApproved, pendingCount, approvedCount, approvalRate, trend };
    }

    return { totalRequested, totalApproved, pendingCount, approvedCount, approvalRate, trend: 0 };
  }, [filteredData, monthlyData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Time Range</label>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Employee</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRequested)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.trend >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={stats.trend >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(stats.trend).toFixed(1)}%
              </span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{formatCurrency(stats.totalApproved)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedCount} commission{stats.approvedCount !== 1 ? "s" : ""} approved
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvalRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">of {filteredData.length} total requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Monthly Commission Trend</CardTitle>
            <CardDescription>Requested vs Approved amounts over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(200 100% 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(200 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                  <YAxis 
                    tick={{ fill: "hsl(var(--muted-foreground))" }} 
                    tickLine={false} 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="requested"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRequested)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    stroke="hsl(200 100% 50%)"
                    fillOpacity={1}
                    fill="url(#colorApproved)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Breakdown Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Top Employees by Commission</CardTitle>
            <CardDescription>Requested vs Approved by employee</CardDescription>
          </CardHeader>
          <CardContent>
            {employeeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={employeeData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: "hsl(var(--muted-foreground))" }} 
                    tickLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                    tickLine={false}
                    width={75}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="requested" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="approved" fill="hsl(200 100% 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No employee data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Commission Submissions</CardTitle>
          <CardDescription>Last 20 commission requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Title</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Requested</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Approved</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(-20).reverse().map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-2">{format(parseISO(item.created_at), "MMM d, yyyy")}</td>
                    <td className="py-3 px-2">{item.submitter_name}</td>
                    <td className="py-3 px-2 max-w-[200px] truncate">{item.title}</td>
                    <td className="py-3 px-2 text-right font-mono">
                      {item.total_payout_requested ? formatCurrency(item.total_payout_requested) : "-"}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-blue-500">
                      {item.approved_amount ? formatCurrency(item.approved_amount) : "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className={
                        item.status === "approved" || item.approval_stage === "manager_approved"
                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                          : item.status === "rejected"
                          ? "bg-red-500/10 text-red-500 border-red-500/30"
                          : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                      }>
                        {item.status === "approved" || item.approval_stage === "manager_approved"
                          ? "Approved"
                          : item.status === "rejected"
                          ? "Rejected"
                          : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No commission data found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
