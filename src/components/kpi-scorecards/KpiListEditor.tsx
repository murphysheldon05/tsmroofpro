import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GripVertical, Plus, Trash2, ChevronDown, Info } from "lucide-react";
import { ScoringGuideEditor } from "./ScoringGuideEditor";
import type { KpiFormValues, ScoringGuideLevel } from "@/lib/kpiTypes";

interface KpiListEditorProps {
  kpis: KpiFormValues[];
  onChange: (kpis: KpiFormValues[]) => void;
}

function SortableKpiItem({
  kpi,
  index,
  onUpdate,
  onDelete,
}: {
  kpi: KpiFormValues;
  index: number;
  onUpdate: (partial: Partial<KpiFormValues>) => void;
  onDelete: () => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sortId = kpi.id ?? `kpi-${index}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-lg border border-border p-3 bg-card space-y-3"
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="mt-1 text-xs font-bold text-muted-foreground w-5 text-center shrink-0">
            {index + 1}
          </span>

          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Short Name</Label>
                <Input
                  value={kpi.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="e.g. Lead Contact"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={kpi.full_name}
                  onChange={(e) => onUpdate({ full_name: e.target.value })}
                  placeholder="e.g. Inbound Lead Contact Rate"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={kpi.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="What this KPI measures and how to score it"
                className="text-sm min-h-[48px] resize-none"
                rows={2}
              />
            </div>

            <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 h-7 px-2"
                >
                  <Info className="w-3.5 h-3.5" />
                  Scoring Guide
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${guideOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ScoringGuideEditor
                  value={kpi.scoring_guide}
                  onChange={(sg) => onUpdate({ scoring_guide: sg })}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent
          className={cn(
            "inset-0 left-0 top-0 z-50 max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 rounded-none sm:inset-auto sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg"
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{kpi.name || `KPI ${index + 1}`}" from this scorecard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function KpiListEditor({ kpis, onChange }: KpiListEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const addKpi = () => {
    const newKpi: KpiFormValues = {
      id: `new-${Date.now()}`,
      name: "",
      full_name: "",
      description: "",
      scoring_guide: [],
      sort_order: kpis.length,
    };
    onChange([...kpis, newKpi]);
  };

  const updateKpi = (index: number, partial: Partial<KpiFormValues>) => {
    const next = kpis.map((k, i) => (i === index ? { ...k, ...partial } : k));
    onChange(next);
  };

  const deleteKpi = (index: number) => {
    onChange(kpis.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = kpis.map((k, i) => k.id ?? `kpi-${i}`);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(kpis, oldIndex, newIndex));
  };

  const sortableIds = kpis.map((k, i) => k.id ?? `kpi-${i}`);

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          {kpis.map((kpi, i) => (
            <SortableKpiItem
              key={kpi.id ?? `kpi-${i}`}
              kpi={kpi}
              index={i}
              onUpdate={(p) => updateKpi(i, p)}
              onDelete={() => deleteKpi(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" onClick={addKpi}>
        <Plus className="w-4 h-4 mr-1.5" />
        Add KPI
      </Button>
    </div>
  );
}
