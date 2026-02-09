import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CommandCenterWidgets, WidgetKey } from "@/hooks/useCommandCenterPreferences";
import { DraggableWidgetItem } from "./DraggableWidgetItem";

interface CommandCenterSettingsProps {
  widgets: CommandCenterWidgets;
  widgetOrder: WidgetKey[];
  onToggle: (key: WidgetKey) => void;
  onReorder: (newOrder: WidgetKey[]) => void;
  onReset: () => void;
}

const WIDGET_LABELS: Record<WidgetKey, { label: string; description: string }> = {
  companyInfo: {
    label: "My Contact Info",
    description: "Your contact details and manager info",
  },
  weather: {
    label: "Weather",
    description: "Current weather and forecast",
  },
  quickStats: {
    label: "Quick Stats",
    description: "Summary of builds, deliveries, and approvals",
  },
  slaSnapshot: {
    label: "Manager SLA Snapshot",
    description: "Review queue accountability at a glance (managers only)",
  },
  quickSOPAccess: {
    label: "Quick Playbook Access",
    description: "Search and find Playbooks fast from Command Center",
  },
  todaysBuilds: {
    label: "Today's Builds",
    description: "Scheduled builds for today",
  },
  todaysDeliveries: {
    label: "Today's Deliveries",
    description: "Scheduled deliveries for today",
  },
  actionRequired: {
    label: "Pending Review / Needs Action",
    description: "Role-based items requiring review or your action",
  },
  quickLinks: {
    label: "Quick Links",
    description: "Shortcuts to common actions",
  },
};

export function CommandCenterSettings({
  widgets,
  widgetOrder,
  onToggle,
  onReorder,
  onReset,
}: CommandCenterSettingsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id as WidgetKey);
      const newIndex = widgetOrder.indexOf(over.id as WidgetKey);
      onReorder(arrayMove(widgetOrder, oldIndex, newIndex));
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Customize Command Center</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Customize Command Center</SheetTitle>
          <SheetDescription>
            Drag to reorder widgets or toggle their visibility.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Note: Core Identity (Mission & Values) is pinned and cannot be moved.
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgetOrder}
              strategy={verticalListSortingStrategy}
            >
              {widgetOrder.map((key) => (
                <DraggableWidgetItem
                  key={key}
                  id={key}
                  label={WIDGET_LABELS[key].label}
                  description={WIDGET_LABELS[key].description}
                  isVisible={widgets[key]}
                  onToggle={() => onToggle(key)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <Separator className="my-6" />

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </SheetContent>
    </Sheet>
  );
}
