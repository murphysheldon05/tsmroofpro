import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUpdateEntryPayType, useCommissionPayTypes, type CommissionPayType } from "@/hooks/useCommissionEntries";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PayTypeBadgeProps {
  entryId: string;
  currentPayType: CommissionPayType;
  repName: string;
  readOnly?: boolean;
}

export function PayTypeBadge({ entryId, currentPayType, repName, readOnly }: PayTypeBadgeProps) {
  const { isAdmin } = useAuth();
  const { data: payTypes = [] } = useCommissionPayTypes();
  const updatePayType = useUpdateEntryPayType();

  const handleChange = (newType: CommissionPayType) => {
    if (newType.id === currentPayType.id) return;
    const firstName = repName.split(" ")[0];
    updatePayType.mutate(
      { id: entryId, pay_type_id: newType.id },
      { onSuccess: () => toast.success(`${firstName}: ${currentPayType.name} → ${newType.name}`) }
    );
  };

  const badgeStyle = {
    backgroundColor: currentPayType.badge_bg,
    color: currentPayType.badge_text,
    borderColor: currentPayType.badge_border,
  };

  if (readOnly || !isAdmin) {
    return <Badge style={badgeStyle} className="border text-xs">{currentPayType.name}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <Badge style={badgeStyle} className="border text-xs cursor-pointer hover:opacity-80 transition-opacity">
            {currentPayType.name}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {payTypes.map((pt) => (
          <DropdownMenuItem key={pt.id} onClick={() => handleChange(pt)} className={pt.id === currentPayType.id ? "font-bold" : ""}>
            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pt.badge_bg }} />
            {pt.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
