import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SIDEBAR_SECTIONS, useUserPermissions, useUpdateUserPermissions } from "@/hooks/useUserPermissions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserPermissionsEditorProps {
  userId: string;
  userRole: string;
  onClose?: () => void;
}

export function UserPermissionsEditor({ userId, userRole, onClose }: UserPermissionsEditorProps) {
  const { data: existingPermissions, isLoading } = useUserPermissions(userId);
  const updatePermissions = useUpdateUserPermissions();
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);

  useEffect(() => {
    if (existingPermissions) {
      setSelectedSections(existingPermissions);
      setHasCustomPermissions(existingPermissions.length > 0);
    }
  }, [existingPermissions]);

  if (userRole !== "employee") {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
        Admins and Managers have full access to all sections. Permission customization is only available for employees.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleParent = (parentKey: string, checked: boolean) => {
    const children = SIDEBAR_SECTIONS.filter((s) => s.parent === parentKey);
    if (checked) {
      // Add parent and all children
      setSelectedSections((prev) => {
        const newSet = new Set(prev);
        newSet.add(parentKey);
        children.forEach((c) => newSet.add(c.key));
        return Array.from(newSet);
      });
    } else {
      // Remove parent and all children
      setSelectedSections((prev) =>
        prev.filter((k) => k !== parentKey && !children.some((c) => c.key === k))
      );
    }
  };

  const handleSave = async () => {
    try {
      // If custom permissions disabled, clear all permissions (full access)
      const sectionsToSave = hasCustomPermissions ? selectedSections : [];
      await updatePermissions.mutateAsync({ userId, sections: sectionsToSave });
      toast.success("Permissions updated successfully");
      onClose?.();
    } catch (error) {
      toast.error("Failed to update permissions");
    }
  };

  const parentSections = SIDEBAR_SECTIONS.filter((s) => s.parent === null);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 pb-3 border-b">
        <Checkbox
          id="custom-permissions"
          checked={hasCustomPermissions}
          onCheckedChange={(checked) => {
            setHasCustomPermissions(!!checked);
            if (!checked) {
              setSelectedSections([]);
            }
          }}
        />
        <Label htmlFor="custom-permissions" className="text-sm font-medium cursor-pointer">
          Enable custom permissions (restrict access to specific sections)
        </Label>
      </div>

      {hasCustomPermissions && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {parentSections.map((parent) => {
            const children = SIDEBAR_SECTIONS.filter((s) => s.parent === parent.key);
            const hasChildren = children.length > 0;
            const isParentChecked = selectedSections.includes(parent.key);
            const allChildrenChecked = hasChildren && children.every((c) => selectedSections.includes(c.key));
            const someChildrenChecked = hasChildren && children.some((c) => selectedSections.includes(c.key));

            return (
              <div key={parent.key} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={parent.key}
                    checked={hasChildren ? (isParentChecked || allChildrenChecked) : isParentChecked}
                    onCheckedChange={(checked) => {
                      if (hasChildren) {
                        toggleParent(parent.key, !!checked);
                      } else {
                        toggleSection(parent.key);
                      }
                    }}
                    className={cn(
                      hasChildren && someChildrenChecked && !allChildrenChecked && !isParentChecked &&
                      "data-[state=unchecked]:bg-primary/30"
                    )}
                  />
                  <Label htmlFor={parent.key} className="text-sm font-medium cursor-pointer">
                    {parent.label}
                  </Label>
                </div>

                {hasChildren && (
                  <div className="ml-6 space-y-1.5 border-l-2 border-muted pl-3">
                    {children.map((child) => (
                      <div key={child.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={child.key}
                          checked={selectedSections.includes(child.key) || isParentChecked}
                          disabled={isParentChecked}
                          onCheckedChange={() => toggleSection(child.key)}
                        />
                        <Label
                          htmlFor={child.key}
                          className={cn(
                            "text-sm cursor-pointer",
                            isParentChecked && "text-muted-foreground"
                          )}
                        >
                          {child.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!hasCustomPermissions && (
        <p className="text-sm text-muted-foreground">
          This employee has access to all sections. Enable custom permissions above to restrict access.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={updatePermissions.isPending}>
          {updatePermissions.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Permissions
        </Button>
      </div>
    </div>
  );
}
