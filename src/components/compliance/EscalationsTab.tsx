import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { EscalationsFilters, EscalationsFiltersState } from "./EscalationsFilters";
import { EscalationsTable } from "./EscalationsTable";
import { EscalationActionModals } from "./EscalationActionModals";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 25;

export function EscalationsTab() {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  // Initialize filters from URL params
  const initialStatus = searchParams.get("status") || "all";
  
  const [filters, setFilters] = useState<EscalationsFiltersState>({
    status: initialStatus,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Fetch escalations with filters and joined data
  const { data: escalationsData, isLoading } = useQuery({
    queryKey: ["compliance-escalations-paginated", filters, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("compliance_escalations")
        .select(`
          *,
          compliance_violations (
            id,
            sop_key,
            description,
            severity,
            status,
            department,
            job_id,
            violation_type
          )
        `, { count: "exact" });

      // Apply filters
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch profile info for escalated_by_user_id
      const userIds = [...new Set(data?.map(e => e.escalated_by_user_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = { full_name: p.full_name, email: p.email };
        });
      }

      // Attach profile info to escalations
      const escalationsWithProfiles = data?.map(e => ({
        ...e,
        escalated_by_profile: e.escalated_by_user_id 
          ? profilesMap[e.escalated_by_user_id] || null 
          : null,
      }));

      return {
        escalations: escalationsWithProfiles || [],
        totalCount: count || 0,
      };
    },
  });

  const totalPages = useMemo(() => {
    return Math.ceil((escalationsData?.totalCount || 0) / PAGE_SIZE);
  }, [escalationsData?.totalCount]);

  const handleResetFilters = () => {
    setFilters({ status: "all" });
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: EscalationsFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleAction = (escalation: any, action: string) => {
    setSelectedEscalation(escalation);
    setSelectedAction(action);
  };

  const handleCloseActionModal = () => {
    setSelectedEscalation(null);
    setSelectedAction(null);
  };

  const handleViewViolation = (violationId: string) => {
    // For now, just show a toast - could navigate to violations tab
    toast.info(`Viewing violation ${violationId.slice(0, 8)}...`);
  };

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, escalationsData?.totalCount || 0);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Escalations
          {!isAdmin && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              (View only - Admin approval required)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <EscalationsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
        />

        {/* Table */}
        <EscalationsTable
          escalations={escalationsData?.escalations}
          isLoading={isLoading}
          isAdmin={isAdmin}
          onAction={handleAction}
          onViewViolation={handleViewViolation}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startItem}–{endItem} of {escalationsData?.totalCount || 0} escalations
            </p>
            
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {getPageNumbers().map((page, idx) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>

      {/* Modals */}
      <EscalationActionModals
        escalation={selectedEscalation}
        action={selectedAction}
        onClose={handleCloseActionModal}
      />
    </Card>
  );
}
