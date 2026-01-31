import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus } from "lucide-react";

import { ViolationsFilters, ViolationsFiltersState } from "./ViolationsFilters";
import { ViolationsTable } from "./ViolationsTable";
import { ViolationsPagination } from "./ViolationsPagination";
import { ViolationActionModals } from "./ViolationActionModals";
import { LogViolationModalEnhanced } from "./LogViolationModalEnhanced";

const PAGE_SIZE = 25;

export function ViolationsTab() {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  // Initialize filters from URL params
  const initialStatus = searchParams.get("status") || "all";
  
  const [filters, setFilters] = useState<ViolationsFiltersState>({
    status: initialStatus,
    severity: "all",
    sop: "all",
    department: "all",
    dateRange: undefined,
    jobIdSearch: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Fetch violations with filters
  const { data: violationsData, isLoading } = useQuery({
    queryKey: ["compliance-violations-paginated", filters, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("compliance_violations")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.severity !== "all") {
        query = query.eq("severity", filters.severity);
      }
      if (filters.sop !== "all") {
        query = query.eq("sop_key", filters.sop);
      }
      if (filters.department !== "all") {
        query = query.eq("department", filters.department);
      }
      if (filters.dateRange?.from) {
        query = query.gte("created_at", filters.dateRange.from.toISOString());
      }
      if (filters.dateRange?.to) {
        query = query.lte("created_at", filters.dateRange.to.toISOString());
      }
      if (filters.jobIdSearch) {
        query = query.ilike("job_id", `%${filters.jobIdSearch}%`);
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        violations: data || [],
        totalCount: count || 0,
      };
    },
  });

  const totalPages = useMemo(() => {
    return Math.ceil((violationsData?.totalCount || 0) / PAGE_SIZE);
  }, [violationsData?.totalCount]);

  const handleResetFilters = () => {
    setFilters({
      status: "all",
      severity: "all",
      sop: "all",
      department: "all",
      dateRange: undefined,
      jobIdSearch: "",
    });
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: ViolationsFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleAction = async (violationId: string, action: string) => {
    // Find the violation
    const violation = violationsData?.violations.find((v: any) => v.id === violationId);
    if (violation) {
      setSelectedViolation(violation);
      setSelectedAction(action);
    }
  };

  const handleCloseActionModal = () => {
    setSelectedViolation(null);
    setSelectedAction(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Compliance Violations
        </CardTitle>
        <Button onClick={() => setLogModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Log New Violation
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <ViolationsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
        />

        {/* Table */}
        <ViolationsTable
          violations={violationsData?.violations}
          isLoading={isLoading}
          isAdmin={isAdmin}
          onAction={handleAction}
        />

        {/* Pagination */}
        <ViolationsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={violationsData?.totalCount || 0}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </CardContent>

      {/* Modals */}
      <LogViolationModalEnhanced
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
      />

      <ViolationActionModals
        violation={selectedViolation}
        action={selectedAction}
        onClose={handleCloseActionModal}
      />
    </Card>
  );
}
