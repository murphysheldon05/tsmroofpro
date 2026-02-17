import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommissionEntry {
  id: string;
  rep_name: string;
  job: string | null;
  customer: string | null;
  approved_date: string | null;
  job_value: number | null;
  amount_paid: number;
  paid_date: string;
  check_type: string | null;
  notes: string | null;
  pay_type: string;
  earned_comm: number | null;
  applied_bank: number | null;
  has_paid: boolean;
  created_at: string;
}

export function useCommissionEntries() {
  return useQuery({
    queryKey: ["commission-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_entries")
        .select("*")
        .order("paid_date", { ascending: true });
      if (error) throw error;
      return data as CommissionEntry[];
    },
  });
}

export function useUpdatePayType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pay_type }: { id: string; pay_type: string }) => {
      const { error } = await supabase
        .from("commission_entries")
        .update({ pay_type })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-entries"] });
    },
  });
}

// Helpers
export const PAY_TYPES = ["Commission", "Draw", "Draw/Guarantee", "Training Draw (NR)", "Advance"] as const;

export const PAY_TYPE_COLORS: Record<string, string> = {
  "Commission": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  "Draw": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  "Draw/Guarantee": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  "Training Draw (NR)": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  "Advance": "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
};

export const REP_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  "bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-amber-600",
  "bg-rose-600", "bg-cyan-600", "bg-indigo-600", "bg-teal-600",
  "bg-orange-600", "bg-pink-600", "bg-lime-600", "bg-fuchsia-600",
];

let colorIndex = 0;
export function getRepColor(repName: string): string {
  if (!REP_COLORS[repName]) {
    REP_COLORS[repName] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorIndex++;
  }
  return REP_COLORS[repName];
}

export function getRepInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function formatUSD(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

export function formatUSDCompact(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatUSD(amount);
}

export function slugifyRep(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
