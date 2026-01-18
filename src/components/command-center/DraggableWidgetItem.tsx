import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { WidgetKey } from "@/hooks/useCommandCenterPreferences";

interface DraggableWidgetItemProps {
  id: WidgetKey;
  label: string;
  description: string;
  isVisible: boolean;
  onToggle: () => void;
}

export function DraggableWidgetItem({
  id,
  label,
  description,
  isVisible,
  onToggle,
}: DraggableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border p-4 bg-background ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${label}`}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <Switch id={id} checked={isVisible} onCheckedChange={onToggle} />
    </div>
  );
}
