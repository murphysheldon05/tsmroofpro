import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePrefetch";
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
  Settings,
  LogOut,
  ChevronDown,
  Hammer,
  Shield,
  Wrench,
  Menu,
  X,
  User,
  Users,
  Truck,
  DollarSign,
  Calendar,
  GripVertical,
  Compass,
  BarChart3,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCurrentUserPermissions, isSectionVisible } from "@/hooks/useUserPermissions";
import { useSidebarOrder } from "@/hooks/useSidebarOrder";
import { useWalkthroughContext } from "@/contexts/WalkthroughContext";
import { usePendingComplianceCount, useNewWarrantyCount, useSheldonPendingCount } from "@/hooks/useNavBadgeCounts";
import { formatDisplayName } from "@/lib/displayName";
import { getAccessibleWeeklyKpiCards } from "@/lib/weeklyKpiAccess";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavChild {
  title: string;
  href: string;
  icon?: React.ElementType;
  sectionKey: string;
  managerOnly?: boolean;
  adminOnly?: boolean;
  salesRepOnly?: boolean;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  sectionKey: string;
  children?: NavChild[];
  tutorialTarget?: string;
  activeColor?: string;
}

// Base navigation items (commission item is added dynamically based on role)
const baseNavigationItems: NavItem[] = [
  {
    title: "Command Center",
    href: "/command-center",
    icon: LayoutGrid,
    sectionKey: "command-center",
    activeColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Production",
    icon: Hammer,
    sectionKey: "production",
    activeColor: "text-orange-600 dark:text-orange-400",
    children: [
      { title: "Build Schedule", href: "/build-schedule", icon: Calendar, sectionKey: "production-calendar/build" },
      { title: "Delivery Schedule", href: "/delivery-schedule", icon: Truck, sectionKey: "production-calendar/delivery" },
      { title: "Warranty Tracker", href: "/warranties", icon: Shield, sectionKey: "production/warranties" },
    ],
  },
  {
    title: "Subs & Vendors",
    icon: Truck,
    sectionKey: "vendors",
    activeColor: "text-purple-600 dark:text-purple-400",
    children: [
      { title: "Sub-Contractors", href: "/vendors/subcontractors", icon: Wrench, sectionKey: "vendors/subcontractors" },
      { title: "Contact List", href: "/vendors/contact-list", icon: Users, sectionKey: "vendors/contact-list" },
      { title: "Team Directory", href: "/user-directory", icon: Users, sectionKey: "directory" },
    ],
  },
];

// Take the Tour button — uses WalkthroughContext
function TakeTheTourButton() {
  const { startTour } = useWalkthroughContext();
  return (
    <button
      onClick={startTour}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80 transition-colors duration-150"
    >
      <Compass className="w-4 h-4" />
      Take the Tour
    </button>
  );
}

// Red numeric badge for nav items
function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Sortable nav item component
function SortableNavItem({
  item,
  isActive,
  isParentActive,
  openSections,
  toggleSection,
  handleNavClick,
  badgeCount,
  badgeMoveToChildTitle,
  activeColor,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
  isParentActive: (children?: { href: string }[]) => boolean;
  openSections: string[];
  toggleSection: (title: string) => void;
  handleNavClick: (href: string) => void;
  badgeCount?: number;
  badgeMoveToChildTitle?: string;
  activeColor?: string;
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
                data-tutorial={item.tutorialTarget}
                className={cn(
                  "flex-1 flex items-center justify-between px-2 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 relative",
                  isParentActive(item.children)
                    ? "nav-item-active"
                    : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary/80"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={cn("w-4 h-4", isParentActive(item.children) && "nav-icon-glow", isParentActive(item.children) && activeColor)} />
                  {item.title}
                  {badgeCount != null && badgeCount > 0 && !(openSections.includes(item.title) && badgeMoveToChildTitle) && (
                    <NavBadge count={badgeCount} />
                  )}
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
              const showBadgeOnChild = openSections.includes(item.title) && badgeMoveToChildTitle === child.title && badgeCount != null && badgeCount > 0;
              return (
                <button
                  key={child.href}
                  onClick={() => handleNavClick(child.href)}
                  onMouseEnter={() => prefetchRoute(child.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 relative",
                    isActive(child.href)
                      ? "nav-item-active font-medium"
                      : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80"
                  )}
                >
                  {child.icon && <child.icon className={cn("w-4 h-4", isActive(child.href) && "nav-icon-glow", isActive(child.href) && activeColor)} />}
                  {child.title}
                  {showBadgeOnChild && <span className="ml-auto"><NavBadge count={badgeCount!} /></span>}
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
            data-tutorial={item.tutorialTarget}
            onClick={() => handleNavClick(item.href!)}
            onMouseEnter={() => prefetchRoute(item.href!)}
            className={cn(
              "flex-1 flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-150 relative min-h-[44px]",
              isActive(item.href!)
                ? "nav-item-active"
                : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary/80"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive(item.href!) && "nav-icon-glow", isActive(item.href!) && activeColor)} />
            <span className="truncate flex-1">{item.title}</span>
            {badgeCount != null && badgeCount > 0 && <NavBadge count={badgeCount} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isManager, role, user, userDepartment } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const { data: userPermissions } = useCurrentUserPermissions();
  const { order, reorder } = useSidebarOrder();
  const [profile, setProfile] = useState<{ avatar_url: string | null; full_name: string | null } | null>(null);
  const { data: pendingComplianceCount = 0 } = usePendingComplianceCount();
  const { data: newWarrantyCount = 0 } = useNewWarrantyCount();
  const { data: sheldonPendingCount = 0 } = useSheldonPendingCount();
  const showCommissionsBadge = isAdmin && pendingComplianceCount > 0;
  const showAdminPanelBadge = sheldonPendingCount > 0;
  const showProductionBadge = isSectionVisible("production", userPermissions, role) && newWarrantyCount > 0;

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
    return 'secondary';
  };

  const getRoleLabel = () => {
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    if (role === 'sales_manager') return 'Sales Manager';
    if (role === 'sales_rep') return 'Sales Rep';
    if (role === 'accounting') return 'Accounting';
    if (role === 'production_manager' || role === 'production') return 'Production';
    return 'User';
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  // Keep parent dropdown open when navigating to any of its subcategories
  useEffect(() => {
    const pathname = location.pathname;
    baseNavigationItems.forEach((item) => {
      if (item.children?.length) {
        const childActive = item.children.some(
          (c) => pathname === c.href || (c.href !== "/" && pathname.startsWith(c.href))
        );
        if (childActive) {
          setOpenSections((prev) =>
            prev.includes(item.title) ? prev : [...prev, item.title]
          );
        }
      }
    });
  }, [location.pathname]);

  const isActive = (href: string) => {
    if (location.pathname === href) return true;
    if (href === "/kpi-scorecards" && location.pathname.startsWith("/kpi-scorecards/")) return true;
    return false;
  };
  const isParentActive = (children?: { href: string }[]) =>
    children?.some((child) => location.pathname.startsWith(child.href));

  const handleNavClick = (href: string) => {
    navigate(href);
    setMobileOpen(false);
  };

  // Build navigation with role-based commission item
  const filteredNavigation = useMemo(() => {
    const canAccessKpiScorecards =
      getAccessibleWeeklyKpiCards({
        role,
        fullName: profile?.full_name,
        email: user?.email,
      }).length > 0;

    const commissionItem: NavItem = isAdmin
      ? {
          title: "Commission Manager",
          href: "/commission-manager",
          icon: DollarSign,
          sectionKey: "commissions",
          tutorialTarget: "sidebar-commissions",
          activeColor: "text-amber-600 dark:text-amber-400",
        }
      : {
          title: "Commissions",
          href: "/commissions",
          icon: DollarSign,
          sectionKey: "commissions",
          tutorialTarget: "sidebar-commissions",
          activeColor: "text-amber-600 dark:text-amber-400",
        };

    const kpiScorecardsItem: NavItem = {
      title: "KPI Scorecards",
      href: "/kpi-scorecards",
      icon: BarChart3,
      sectionKey: "kpi-scorecards",
      activeColor: "text-blue-600 dark:text-blue-400",
    };

    const chamberItem: NavItem = {
      title: "Chamber of Commerce",
      href: "/chamber-of-commerce",
      icon: Building2,
      sectionKey: "chamber-of-commerce",
      activeColor: "text-rose-600 dark:text-rose-400",
    };

    const allItems: NavItem[] = [
      baseNavigationItems[0], // Command Center
      commissionItem,
      ...(canAccessKpiScorecards ? [kpiScorecardsItem] : []),
      chamberItem,
      ...baseNavigationItems.slice(1), // Production, Subs & Vendors
    ];

    return allItems
      .filter((item) =>
        item.sectionKey === "kpi-scorecards"
          ? canAccessKpiScorecards
          : isSectionVisible(item.sectionKey, userPermissions, role)
      )
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) =>
            isSectionVisible(child.sectionKey, userPermissions, role)
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        return item;
      })
      .filter(Boolean) as NavItem[];
  }, [userPermissions, role, isAdmin]);

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
        <Logo size="sm" showText />
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <div data-tutorial="notification-bell">
            <NotificationBell />
          </div>
        </div>
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
              const badgeCount = (item.title === "Commission Manager" || item.title === "Commissions") && showCommissionsBadge ? pendingComplianceCount : item.title === "Production" && showProductionBadge ? newWarrantyCount : undefined;
              const badgeMoveToChildTitle = item.title === "Production" ? "Warranty Tracker" : undefined;
              return (
                <SortableNavItem
                  key={item.title}
                  item={item}
                  isActive={isActive}
                  isParentActive={isParentActive}
                  openSections={openSections}
                  toggleSection={toggleSection}
                  handleNavClick={handleNavClick}
                  badgeCount={badgeCount}
                  badgeMoveToChildTitle={badgeMoveToChildTitle}
                  activeColor={item.activeColor}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </nav>

      <div className="p-3 border-t border-border/50 space-y-1">
        {/* Take the Tour */}
        <TakeTheTourButton />

        {/* User info with avatar and role badge */}
        <button
          data-tutorial="sidebar-profile"
          onClick={() => handleNavClick("/profile")}
          onMouseEnter={() => prefetchRoute("/profile")}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors duration-150",
            isActive("/profile")
              ? "nav-item-active"
              : "bg-surface-2/50 hover:bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-8 h-8 flex-shrink-0 border border-primary/30 ring-1 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={formatDisplayName(profile?.full_name, user?.email) || "Profile"} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(() => {
                  const name = formatDisplayName(profile?.full_name, user?.email);
                  return name && name !== "Unknown" ? getInitials(name) : <User className="w-4 h-4" />;
                })()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0">
              {user && (
                <span className="text-sm font-medium truncate max-w-[120px] text-foreground/90">
                  {formatDisplayName(profile?.full_name, user?.email)}
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

        {/* Admin Panel */}
        {isAdmin && (
          <div className="pt-2 border-t border-border/30">
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[1px] px-3 mb-1 block">
              Admin Panel
            </span>
            <button
              onClick={() => handleNavClick("/admin")}
              onMouseEnter={() => prefetchRoute("/admin")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors duration-150 relative min-h-[44px]",
                isActive("/admin")
                  ? "nav-item-active font-medium"
                  : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80"
              )}
            >
              <Settings className={cn("w-5 h-5", isActive("/admin") && "nav-icon-glow")} />
              <span className="truncate flex-1 text-left">Admin Panel</span>
              {showAdminPanelBadge && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold">
                  {sheldonPendingCount > 99 ? "99+" : sheldonPendingCount}
                </span>
              )}
            </button>
          </div>
        )}
        
        {/* ThemeToggle moved to compact icon in header */}
        
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors duration-150 min-h-[44px]"
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
