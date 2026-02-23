import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";
import { 
  useCommissionTiers, 
  useCreateCommissionTier, 
  useUpdateCommissionTier, 
  useDeleteCommissionTier,
  type CommissionTier 
} from "@/hooks/useCommissionTiers";
import { formatTierPercent } from "@/lib/commissionDocumentCalculations";
import { Skeleton } from "@/components/ui/skeleton";

interface TierFormData {
  name: string;
  description: string;
  allowed_op_percentages: string;
  allowed_profit_splits: string;
  is_active: boolean;
}

const defaultFormData: TierFormData = {
  name: "",
  description: "",
  allowed_op_percentages: "10, 12.5, 15",
  allowed_profit_splits: "35, 40, 45, 50",
  is_active: true,
};

export function CommissionTierManager() {
  const { data: tiers, isLoading } = useCommissionTiers();
  const createMutation = useCreateCommissionTier();
  const updateMutation = useUpdateCommissionTier();
  const deleteMutation = useDeleteCommissionTier();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CommissionTier | null>(null);
  const [formData, setFormData] = useState<TierFormData>(defaultFormData);

  const parsePercentages = (input: string): number[] => {
    return input
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n))
      .map(n => n / 100); // Convert to decimal
  };

  const formatPercentages = (decimals: number[]): string => {
    return decimals.map(d => (d * 100).toString()).join(', ');
  };

  const handleOpenCreate = () => {
    setEditingTier(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (tier: CommissionTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      description: tier.description || "",
      allowed_op_percentages: formatPercentages(tier.allowed_op_percentages),
      allowed_profit_splits: formatPercentages(tier.allowed_profit_splits),
      is_active: tier.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: formData.name,
      description: formData.description || null,
      allowed_op_percentages: parsePercentages(formData.allowed_op_percentages),
      allowed_profit_splits: parsePercentages(formData.allowed_profit_splits),
      is_active: formData.is_active,
    };

    if (editingTier) {
      await updateMutation.mutateAsync({ id: editingTier.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this commission tier?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commission Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Commission Tiers
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTier ? 'Edit' : 'Create'} Commission Tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tier Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Senior Rep"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Allowed O&P Percentages</Label>
                <Input
                  value={formData.allowed_op_percentages}
                  onChange={(e) => setFormData({ ...formData, allowed_op_percentages: e.target.value })}
                  placeholder="10, 12.5, 15"
                />
                <p className="text-xs text-muted-foreground">Enter comma-separated values (e.g., 10, 12.5, 15)</p>
              </div>
              <div className="space-y-2">
                <Label>Allowed Profit Split Percentages</Label>
                <Input
                  value={formData.allowed_profit_splits}
                  onChange={(e) => setFormData({ ...formData, allowed_profit_splits: e.target.value })}
                  placeholder="35, 40, 45, 50, 55, 60"
                />
                <p className="text-xs text-muted-foreground">Enter comma-separated values (e.g., 35, 40, 45)</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                >
                  {editingTier ? 'Update' : 'Create'} Tier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tiers && tiers.length > 0 ? (
          <div className="space-y-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="font-medium">{tier.name}</div>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">O&P:</span>{' '}
                      {tier.allowed_op_percentages.map((p) => (
                        <Badge key={p} variant="outline" className="mr-1">
                          {formatTierPercent(p)}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Profit Split:</span>{' '}
                      {tier.allowed_profit_splits.map((p) => (
                        <Badge key={p} variant="secondary" className="mr-1">
                          {formatTierPercent(p)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(tier)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(tier.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No commission tiers configured yet. Create one to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
