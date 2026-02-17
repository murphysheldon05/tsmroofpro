import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PAY_TYPES, PAY_TYPE_COLORS, useUpdatePayType } from "@/hooks/useCommissionEntries";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PayTypeBadgeProps {
  entryId: string;
  currentType: string;
  repName: string;
  readOnly?: boolean;
}

export function PayTypeBadge({ entryId, currentType, repName, readOnly }: PayTypeBadgeProps) {
  const { isAdmin } = useAuth();
  const updatePayType = useUpdatePayType();
  const colorClass = PAY_TYPE_COLORS[currentType] || "bg-muted text-muted-foreground";

  const handleChange = (newType: string) => {
    if (newType === currentType) return;
    const firstName = repName.split(" ")[0];
    updatePayType.mutate(
      { id: entryId, pay_type: newType },
      {
        onSuccess: () => {
          toast.success(`${firstName}: ${currentType} → ${newType}`);
        },
      }
    );
  };

  if (readOnly || !isAdmin) {
    return <Badge className={`${colorClass} text-xs`}>{currentType}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <Badge className={`${colorClass} text-xs cursor-pointer hover:opacity-80 transition-opacity`}>
            {currentType}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PAY_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => handleChange(type)} className={type === currentType ? "font-bold" : ""}>
            {type}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
