import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutGrid,
  FileText,
  GraduationCap,
  Wrench,
  Send,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  Hammer,
  FileCode,
  Calculator,
  Shield,
  UserPlus,
  Video,
  Menu,
  X,
  User,
  Users,
  Truck,
  DollarSign,
  Calendar,
  ClipboardCheck,
  BookOpen,
  Lock,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCurrentUserPermissions, isSectionVisible } from "@/hooks/useUserPermissions";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";
import { useSidebarOrder } from "@/hooks/useSidebarOrder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavChild {
  title: string;
  href: string;
  icon?: React.ElementType;
  sectionKey: string;
  managerOnly?: boolean;
  requiresPlaybook?: boolean;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  sectionKey: string;
  children?: NavChild[];
  requiresPlaybook?: boolean;
}

// Main navigation items
const navigationItems: NavItem[] = [
  {
    title: "Command Center",
    href: "/command-center",
    icon: LayoutGrid,
    sectionKey: "command-center",
  },
  {
    title: "Commissions",
    icon: DollarSign,
    sectionKey: "commissions",
    requiresPlaybook: true,
    children: [
      { title: "Submissions", href: "/commissions", icon: DollarSign, sectionKey: "commissions", requiresPlaybook: true },
      { title: "Documents", href: "/commission-documents", icon: FileText, sectionKey: "commissions", requiresPlaybook: true },
    ],
  },
  {
    title: "Production",
    icon: Hammer,
    sectionKey: "production",
    requiresPlaybook: true,
    children: [
      { title: "Build Schedule", href: "/build-schedule", icon: Calendar, sectionKey: "production/build", requiresPlaybook: true },
      { title: "Delivery Schedule", href: "/delivery-schedule", icon: Truck, sectionKey: "production/delivery", requiresPlaybook: true },
      { title: "Warranty Tracker", href: "/warranties", icon: Shield, sectionKey: "production/warranties", requiresPlaybook: true },
    ],
  },
  {
    title: "Playbook Library",
    icon: BookOpen,
    sectionKey: "sops",
    children: [
      { title: "Master Playbook", href: "/playbook-library/master-playbook", icon: BookOpen, sectionKey: "sops/master-playbook" },
      { title: "Sales", href: "/playbook-library/sales", icon: TrendingUp, sectionKey: "sops/sales", requiresPlaybook: true },
      { title: "Production", href: "/playbook-library/production", icon: Hammer, sectionKey: "sops/production", requiresPlaybook: true },
      { title: "Supplements", href: "/playbook-library/supplements", icon: FileCode, sectionKey: "sops/supplements", requiresPlaybook: true },
      { title: "Office Admin", href: "/playbook-library/office-admin", icon: FileText, sectionKey: "sops/office-admin", requiresPlaybook: true },
      { title: "Accounting", href: "/playbook-library/accounting", icon: Calculator, sectionKey: "sops/accounting", requiresPlaybook: true },
      { title: "Human Resources", href: "/playbook-library/safety-hr", icon: Shield, sectionKey: "sops/safety-hr", requiresPlaybook: true },
      { title: "Templates", href: "/playbook-library/templates-scripts", icon: FileCode, sectionKey: "sops/templates-scripts", requiresPlaybook: true },
    ],
  },
  {
    title: "Training",
    icon: GraduationCap,
    sectionKey: "training",
    requiresPlaybook: true,
    children: [
      { title: "New Hire", href: "/training/new-hire", icon: UserPlus, sectionKey: "training/new-hire", requiresPlaybook: true },
      { title: "Role Training", href: "/training/role-training", icon: GraduationCap, sectionKey: "training/role-training", requiresPlaybook: true },
      { title: "Video Library", href: "/training/video-library", icon: Video, sectionKey: "training/video-library", requiresPlaybook: true },
    ],
  },
  {
    title: "Who to Contact",
    href: "/directory",
    icon: Users,
    sectionKey: "directory",
    requiresPlaybook: true,
  },
  {
    title: "Tools & Systems",
    href: "/tools",
    icon: Wrench,
    sectionKey: "tools",
    requiresPlaybook: true,
  },
  {
    title: "Forms & Requests",
    href: "/requests",
    icon: Send,
    sectionKey: "requests",
    requiresPlaybook: true,
  },
  {
    title: "Subs & Vendors",
    href: "/vendors",
    icon: Truck,
    sectionKey: "vendors",
    requiresPlaybook: true,
  },
];

// Sortable nav item component
function SortableNavItem({
  item,
  isActive,
  isParentActive,
  isLocked,
  openSections,
  toggleSection,
  handleNavClick,
  playbookComplete,
  playbookLoading,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
  isParentActive: (children?: { href: string }[]) => boolean;
  isLocked: boolean;
  openSections: string[];
  toggleSection: (title: string) => void;
  handleNavClick: (href: string, requiresPlaybook?: boolean) => void;
  playbookComplete: boolean;
  playbookLoading: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.title });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {item.children ? (
        <Collapsible
          open={openSections.includes(item.title)}
          onOpenChange={() => toggleSection(item.title)}
        >
          <div className="flex items-center">
            <button
              {...attributes}
              {...listeners}
              className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            >
              <GripVertical className="w-3 h-3" />
            </button>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex-1 flex items-center justify-between px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative",
                  isParentActive(item.children)
                    ? "nav-item-active"
                    : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary/80"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={cn("w-4 h-4", isParentActive(item.children) && "nav-icon-glow")} />
                  {item.title}
                  {isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-150",
                    openSections.includes(item.title) && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-1 ml-6 space-y-1 border-l border-border/30 pl-2">
            {item.children.map((child) => {
              const childLocked = child.requiresPlaybook && !playbookComplete && !playbookLoading;
              return (
                <button
                  key={child.href}
                  onClick={() => handleNavClick(child.href, child.requiresPlaybook)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative",
                    isActive(child.href)
                      ? "nav-item-active font-medium"
                      : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80",
                    childLocked && "opacity-60"
                  )}
                >
                  {child.icon && <child.icon className={cn("w-4 h-4", isActive(child.href) && "nav-icon-glow")} />}
                  {child.title}
                  {childLocked && <Lock className="w-3 h-3 ml-auto text-muted-foreground" />}
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex items-center">
          <button
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          >
            <GripVertical className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleNavClick(item.href!, item.requiresPlaybook)}
            className={cn(
              "flex-1 flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 relative min-h-[44px]",
              isActive(item.href!)
                ? "nav-item-active"
                : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary/80",
              isLocked && "opacity-60"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive(item.href!) && "nav-icon-glow")} />
            <span className="truncate">{item.title}</span>
            {isLocked && <Lock className="w-3.5 h-3.5 ml-auto text-muted-foreground flex-shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isManager, role, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const { data: userPermissions } = useCurrentUserPermissions();
  const { allCompleted: playbookComplete, isLoading: playbookLoading } = useMasterSOPAcknowledgments();
  const { order, reorder } = useSidebarOrder();
  const [profile, setProfile] = useState<{ avatar_url: string | null; full_name: string | null } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user.id)
        .single();
      
      if (data) setProfile(data);
    };

    fetchProfile();

    const channel = supabase
      .channel(`profile-avatar-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile({
            avatar_url: payload.new.avatar_url,
            full_name: payload.new.full_name,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = () => {
    if (role === 'admin') return 'destructive';
    if (role === 'manager') return 'default';
    if (role === 'ops_compliance') return 'default';
    return 'secondary';
  };

  const getRoleLabel = () => {
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    if (role === 'ops_compliance') return 'Ops Compliance';
    return 'Employee';
  };

  const isOpsCompliance = role === 'ops_compliance';

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children?: { href: string }[]) =>
    children?.some((child) => location.pathname.startsWith(child.href));

  const handleNavClick = (href: string, requiresPlaybook?: boolean) => {
    if (requiresPlaybook && !playbookComplete && !playbookLoading) {
      toast.error("Complete your Master Playbook acknowledgments first", {
        description: "Navigate to Playbook Library → Master Playbook to get started.",
        action: {
          label: "Go Now",
          onClick: () => navigate("/playbook-library/master-playbook"),
        },
      });
      return;
    }
    navigate(href);
    setMobileOpen(false);
  };

  // Filter navigation based on permissions
  const filteredNavigation = useMemo(() => {
    return navigationItems
      .filter((item) => isSectionVisible(item.sectionKey, userPermissions, role))
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) => {
            if (child.managerOnly && !isManager && !isAdmin) return false;
            return isSectionVisible(child.sectionKey, userPermissions, role);
          });
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        return item;
      })
      .filter(Boolean) as NavItem[];
  }, [userPermissions, role, isManager, isAdmin]);

  // Sort navigation by user's preferred order
  const sortedNavigation = useMemo(() => {
    return [...filteredNavigation].sort((a, b) => {
      const aIndex = order.indexOf(a.title);
      const bIndex = order.indexOf(b.title);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [filteredNavigation, order]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedNavigation.findIndex((item) => item.title === active.id);
      const newIndex = sortedNavigation.findIndex((item) => item.title === over.id);
      
      const newOrder = arrayMove(
        sortedNavigation.map((item) => item.title),
        oldIndex,
        newIndex
      );
      reorder(newOrder);
    }
  };

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <Logo size="sm" />
        <NotificationBell />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedNavigation.map((item) => item.title)}
            strategy={verticalListSortingStrategy}
          >
            {sortedNavigation.map((item) => {
              const isLocked = item.requiresPlaybook && !playbookComplete && !playbookLoading;
              return (
                <SortableNavItem
                  key={item.title}
                  item={item}
                  isActive={isActive}
                  isParentActive={isParentActive}
                  isLocked={isLocked}
                  openSections={openSections}
                  toggleSection={toggleSection}
                  handleNavClick={handleNavClick}
                  playbookComplete={playbookComplete}
                  playbookLoading={playbookLoading}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </nav>

      <div className="p-3 border-t border-border/50 space-y-1">
        {/* User info with avatar and role badge */}
        <button
          onClick={() => handleNavClick("/profile")}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150",
            isActive("/profile")
              ? "nav-item-active"
              : "bg-surface-2/50 hover:bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-8 h-8 flex-shrink-0 border border-primary/30 ring-1 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Profile"} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {profile?.full_name ? getInitials(profile.full_name) : <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0">
              {profile?.full_name && (
                <span className="text-sm font-medium truncate max-w-[120px] text-foreground/90">
                  {profile.full_name}
                </span>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {user?.email}
              </span>
            </div>
          </div>
          <Badge 
            variant={getRoleBadgeVariant()} 
            className={cn(
              "ml-2 shrink-0",
              role === 'admin' && "bg-primary/20 text-primary border-primary/30",
              role === 'manager' && "bg-primary/15 text-primary/90 border-primary/25"
            )}
          >
            {getRoleLabel()}
          </Badge>
        </button>

        {/* Admin & Manager Panel - Only visible to admins/managers */}
        {(isAdmin || isManager) && (
          <div className="pt-2 border-t border-border/30">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1 block">
              Admin & Manager Panel
            </span>
            <button
              onClick={() => handleNavClick("/pending-review")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150 relative min-h-[44px]",
                isActive("/pending-review")
                  ? "nav-item-active font-medium"
                  : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80"
              )}
            >
              <ClipboardCheck className={cn("w-5 h-5", isActive("/pending-review") && "nav-icon-glow")} />
              Pending Review
            </button>
            {isAdmin && (
              <button
                onClick={() => handleNavClick("/admin")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150 relative min-h-[44px]",
                  isActive("/admin")
                    ? "nav-item-active font-medium"
                    : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80"
                )}
              >
                <Settings className={cn("w-5 h-5", isActive("/admin") && "nav-icon-glow")} />
                Admin Panel
              </button>
            )}
          </div>
        )}

        {/* Ops Compliance - Visible to admin and ops_compliance */}
        {(isAdmin || isOpsCompliance) && (
          <div className={cn("pt-2", !(isAdmin || isManager) && "border-t border-border/30")}>
            {!(isAdmin || isManager) && (
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1 block">
                Compliance
              </span>
            )}
            <button
              onClick={() => handleNavClick("/ops-compliance")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150 relative min-h-[44px]",
                location.pathname.startsWith("/ops-compliance")
                  ? "nav-item-active font-medium"
                  : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80"
              )}
            >
              <Shield className={cn("w-5 h-5", location.pathname.startsWith("/ops-compliance") && "nav-icon-glow")} />
              Ops Compliance
            </button>
          </div>
        )}
        
        <ThemeToggle />
        
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-150 min-h-[44px]"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button - larger touch target */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden w-11 h-11"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - smooth slide transition */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 sidebar-neon flex flex-col z-50 overflow-y-auto",
          "transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
