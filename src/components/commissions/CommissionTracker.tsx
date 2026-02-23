import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { format, parseISO, getMonth, getQuarter, getYear } from "date-fns";
import { CommissionSubmission } from "@/hooks/useCommissions";
import { DollarSign, TrendingUp, Users, FileSpreadsheet, Calendar } from "lucide-react";

interface CommissionTrackerProps {
  submissions: CommissionSubmission[];
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: "#f59e0b",
  rejected: "#ef4444",
  approved_for_payment: "#22c55e",
  paid: "#3b82f6",
  on_hold: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  rejected: "Rejected",
  approved_for_payment: "Approved",
  paid: "Paid",
  on_hold: "On Hold",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CommissionTracker({ submissions }: CommissionTrackerProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedView, setSelectedView] = useState<"monthly" | "quarterly">("monthly");

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    submissions.forEach((s) => {
      years.add(getYear(parseISO(s.created_at)));
    });
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [submissions, currentYear]);

  // Filter submissions by selected year
  const yearSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const year = getYear(parseISO(s.created_at));
      return year === parseInt(selectedYear);
    });
  }, [submissions, selectedYear]);

  // Summary stats for the year
  const yearStats = useMemo(() => {
    const total = yearSubmissions.length;
    const totalRevenue = yearSubmissions.reduce((sum, s) => sum + (s.total_job_revenue || 0), 0);
    const totalGrossCommission = yearSubmissions.reduce((sum, s) => sum + (s.gross_commission || 0), 0);
    const totalNetOwed = yearSubmissions.reduce((sum, s) => {
      if (s.status !== "paid") {
        return sum + (s.net_commission_owed || 0);
      }
      return sum;
    }, 0);
    const totalPaid = yearSubmissions.filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + (s.net_commission_owed || 0), 0);

    return { total, totalRevenue, totalGrossCommission, totalNetOwed, totalPaid };
  }, [yearSubmissions]);

  // Monthly rollup data
  const monthlyData = useMemo(() => {
    const months: Record<number, { 
      count: number; 
      revenue: number; 
      grossCommission: number; 
      netOwed: number; 
      paid: number;
    }> = {};

    // Initialize all months
    for (let i = 0; i < 12; i++) {
      months[i] = { count: 0, revenue: 0, grossCommission: 0, netOwed: 0, paid: 0 };
    }

    yearSubmissions.forEach((s) => {
      const month = getMonth(parseISO(s.created_at));
      months[month].count += 1;
      months[month].revenue += s.total_job_revenue || 0;
      months[month].grossCommission += s.gross_commission || 0;
      months[month].netOwed += s.net_commission_owed || 0;
      if (s.status === "paid") {
        months[month].paid += s.net_commission_owed || 0;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month: MONTH_NAMES[parseInt(month)],
      monthIndex: parseInt(month),
      ...data,
    }));
  }, [yearSubmissions]);

  // Quarterly rollup data
  const quarterlyData = useMemo(() => {
    const quarters: Record<number, { 
      count: number; 
      revenue: number; 
      grossCommission: number; 
      netOwed: number; 
      paid: number;
    }> = {};

    // Initialize all quarters
    for (let i = 1; i <= 4; i++) {
      quarters[i] = { count: 0, revenue: 0, grossCommission: 0, netOwed: 0, paid: 0 };
    }

    yearSubmissions.forEach((s) => {
      const quarter = getQuarter(parseISO(s.created_at));
      quarters[quarter].count += 1;
      quarters[quarter].revenue += s.total_job_revenue || 0;
      quarters[quarter].grossCommission += s.gross_commission || 0;
      quarters[quarter].netOwed += s.net_commission_owed || 0;
      if (s.status === "paid") {
        quarters[quarter].paid += s.net_commission_owed || 0;
      }
    });

    return Object.entries(quarters).map(([quarter, data]) => ({
      quarter: `Q${quarter}`,
      quarterIndex: parseInt(quarter),
      ...data,
    }));
  }, [yearSubmissions]);

  // Rep rollup data
  const repData = useMemo(() => {
    const reps: Record<string, { 
      count: number; 
      revenue: number; 
      grossCommission: number; 
      netOwed: number; 
      paid: number;
      pending: number;
    }> = {};

    yearSubmissions.forEach((s) => {
      const repName = s.submission_type === "subcontractor" 
        ? `SUB: ${s.subcontractor_name}` 
        : s.sales_rep_name || "Unknown";

      if (!reps[repName]) {
        reps[repName] = { count: 0, revenue: 0, grossCommission: 0, netOwed: 0, paid: 0, pending: 0 };
      }

      reps[repName].count += 1;
      reps[repName].revenue += s.total_job_revenue || 0;
      reps[repName].grossCommission += s.gross_commission || 0;
      
      if (s.status === "paid") {
        reps[repName].paid += s.net_commission_owed || 0;
      } else {
        reps[repName].pending += s.net_commission_owed || 0;
      }
      reps[repName].netOwed += s.net_commission_owed || 0;
    });

    return Object.entries(reps)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.netOwed - a.netOwed);
  }, [yearSubmissions]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    yearSubmissions.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      status,
    }));
  }, [yearSubmissions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartConfig = {
    grossCommission: {
      label: "Gross Commission",
      color: "hsl(var(--chart-1))",
    },
    netOwed: {
      label: "Net Owed",
      color: "hsl(var(--chart-2))",
    },
    paid: {
      label: "Paid",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView("monthly")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedView === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedView("quarterly")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedView === "quarterly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Quarterly
          </button>
        </div>
      </div>

      {/* Year Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearStats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Gross Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearStats.totalGrossCommission)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(yearStats.totalNetOwed)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(yearStats.totalPaid)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Commission Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Commission Trend - {selectedView === "monthly" ? "Monthly" : "Quarterly"}
            </CardTitle>
            <CardDescription>
              Gross commission, net owed, and paid amounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedView === "monthly" ? monthlyData : quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey={selectedView === "monthly" ? "month" : "quarter"} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="grossCommission" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]} 
                    name="Gross Commission"
                  />
                  <Bar 
                    dataKey="netOwed" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]} 
                    name="Net Owed"
                  />
                  <Bar 
                    dataKey="paid" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                    name="Paid"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>
              Submissions by current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.status] || "#6b7280"} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ 
                        background: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data for {selectedYear}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rep Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sales Rep / Subcontractor Summary
          </CardTitle>
          <CardDescription>
            Commission totals by rep for {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep / Subcontractor</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Gross Commission</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Total Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repData.map((rep) => (
                  <TableRow key={rep.name}>
                    <TableCell className="font-medium">
                      {rep.name.startsWith("SUB:") ? (
                        <Badge variant="outline" className="font-normal">
                          {rep.name}
                        </Badge>
                      ) : (
                        rep.name
                      )}
                    </TableCell>
                    <TableCell className="text-right">{rep.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rep.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rep.grossCommission)}</TableCell>
                    <TableCell className="text-right text-amber-600">
                      {formatCurrency(rep.pending)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(rep.paid)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(rep.netOwed)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No commission data for {selectedYear}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedView === "monthly" ? "Monthly" : "Quarterly"} Breakdown
          </CardTitle>
          <CardDescription>
            Detailed commission data by {selectedView === "monthly" ? "month" : "quarter"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{selectedView === "monthly" ? "Month" : "Quarter"}</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Gross Commission</TableHead>
                <TableHead className="text-right">Net Owed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(selectedView === "monthly" ? monthlyData : quarterlyData).map((period) => (
                <TableRow key={selectedView === "monthly" ? period.month : period.quarter}>
                  <TableCell className="font-medium">
                    {selectedView === "monthly" ? period.month : period.quarter}
                  </TableCell>
                  <TableCell className="text-right">{period.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(period.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(period.grossCommission)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(period.netOwed)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(period.paid)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
