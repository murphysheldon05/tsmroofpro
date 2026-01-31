import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import { AuditLogFilters, AuditLogFiltersState } from "./AuditLogFilters";
import { AuditLogTable } from "./AuditLogTable";
import { AuditLogExport } from "./AuditLogExport";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 50;

export function AuditLogTab() {
  const [filters, setFilters] = useState<AuditLogFiltersState>({
    dateFrom: "",
    dateTo: "",
    actorId: "all",
    actionType: "all",
    targetType: "all",
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Fetch users for actor dropdown
  const { data: users } = useQuery({
    queryKey: ["compliance-audit-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch audit log entries with filters
  const { data: auditData, isLoading } = useQuery({
    queryKey: ["compliance-audit-log-paginated", filters, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("compliance_audit_log")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte("created_at", startOfDay(parseISO(filters.dateFrom)).toISOString());
      }
      if (filters.dateTo) {
        query = query.lte("created_at", endOfDay(parseISO(filters.dateTo)).toISOString());
      }
      if (filters.actorId !== "all") {
        query = query.eq("actor_user_id", filters.actorId);
      }
      if (filters.actionType !== "all") {
        query = query.eq("action", filters.actionType);
      }
      if (filters.targetType !== "all") {
        query = query.eq("target_type", filters.targetType);
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch profile info for actor_user_ids
      const userIds = [...new Set(data?.map((e) => e.actor_user_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds as string[]);

        profiles?.forEach((p) => {
          profilesMap[p.id] = { full_name: p.full_name, email: p.email };
        });
      }

      // Attach profile info
      const entriesWithProfiles = data?.map((e) => ({
        ...e,
        actor_profile: e.actor_user_id ? profilesMap[e.actor_user_id] || null : null,
      }));

      return {
        entries: entriesWithProfiles || [],
        totalCount: count || 0,
      };
    },
  });

  // Fetch all filtered entries for export (no pagination)
  const { data: exportData, isLoading: exportLoading } = useQuery({
    queryKey: ["compliance-audit-log-export", filters],
    queryFn: async () => {
      let query = supabase.from("compliance_audit_log").select("*");

      if (filters.dateFrom) {
        query = query.gte("created_at", startOfDay(parseISO(filters.dateFrom)).toISOString());
      }
      if (filters.dateTo) {
        query = query.lte("created_at", endOfDay(parseISO(filters.dateTo)).toISOString());
      }
      if (filters.actorId !== "all") {
        query = query.eq("actor_user_id", filters.actorId);
      }
      if (filters.actionType !== "all") {
        query = query.eq("action", filters.actionType);
      }
      if (filters.targetType !== "all") {
        query = query.eq("target_type", filters.targetType);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;

      // Fetch profile info
      const userIds = [...new Set(data?.map((e) => e.actor_user_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds as string[]);

        profiles?.forEach((p) => {
          profilesMap[p.id] = { full_name: p.full_name, email: p.email };
        });
      }

      return data?.map((e) => ({
        ...e,
        actor_profile: e.actor_user_id ? profilesMap[e.actor_user_id] || null : null,
      }));
    },
    enabled: false, // Only fetch on export
  });

  const totalPages = useMemo(() => {
    return Math.ceil((auditData?.totalCount || 0) / PAGE_SIZE);
  }, [auditData?.totalCount]);

  const handleResetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      actorId: "all",
      actionType: "all",
      targetType: "all",
    });
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: AuditLogFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleTargetClick = (targetType: string, targetId: string) => {
    toast.info(`Viewing ${targetType} ${targetId.slice(0, 8)}...`);
  };

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, auditData?.totalCount || 0);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            Audit Log
            <span className="text-xs font-normal text-muted-foreground ml-2">
              (Read-only)
            </span>
          </CardTitle>
          <AuditLogExport entries={auditData?.entries} isLoading={isLoading} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <AuditLogFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
          users={users || []}
        />

        {/* Table */}
        <AuditLogTable
          entries={auditData?.entries}
          isLoading={isLoading}
          onTargetClick={handleTargetClick}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startItem}–{endItem} of {auditData?.totalCount || 0} entries
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
    </Card>
  );
}
