import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, Plus } from "lucide-react";

import { HoldsFilters, HoldsFiltersState } from "./HoldsFilters";
import { HoldsTable } from "./HoldsTable";
import { HoldsPagination } from "./HoldsPagination";
import { HoldActionModals } from "./HoldActionModals";
import { ApplyHoldModalEnhanced } from "./ApplyHoldModalEnhanced";

const PAGE_SIZE = 25;

export function HoldsTab() {
  const [searchParams] = useSearchParams();

  // Initialize filters from URL params
  const initialStatus = searchParams.get("status") || "all";
  
  const [filters, setFilters] = useState<HoldsFiltersState>({
    status: initialStatus,
    holdType: "all",
    dateRange: undefined,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedHold, setSelectedHold] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Fetch holds with filters
  const { data: holdsData, isLoading } = useQuery({
    queryKey: ["compliance-holds-paginated", filters, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("compliance_holds")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.holdType !== "all") {
        query = query.eq("hold_type", filters.holdType);
      }
      if (filters.dateRange?.from) {
        query = query.gte("created_at", filters.dateRange.from.toISOString());
      }
      if (filters.dateRange?.to) {
        query = query.lte("created_at", filters.dateRange.to.toISOString());
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        holds: data || [],
        totalCount: count || 0,
      };
    },
  });

  const totalPages = useMemo(() => {
    return Math.ceil((holdsData?.totalCount || 0) / PAGE_SIZE);
  }, [holdsData?.totalCount]);

  const handleResetFilters = () => {
    setFilters({
      status: "all",
      holdType: "all",
      dateRange: undefined,
    });
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: HoldsFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleAction = (holdId: string, action: string, hold: any) => {
    setSelectedHold(hold);
    setSelectedAction(action);
  };

  const handleCloseActionModal = () => {
    setSelectedHold(null);
    setSelectedAction(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-500" />
          Compliance Holds
        </CardTitle>
        <Button onClick={() => setApplyModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Apply New Hold
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <HoldsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
        />

        {/* Table */}
        <HoldsTable
          holds={holdsData?.holds}
          isLoading={isLoading}
          onAction={handleAction}
        />

        {/* Pagination */}
        <HoldsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={holdsData?.totalCount || 0}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </CardContent>

      {/* Modals */}
      <ApplyHoldModalEnhanced
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
      />

      <HoldActionModals
        hold={selectedHold}
        action={selectedAction}
        onClose={handleCloseActionModal}
      />
    </Card>
  );
}
