import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutGrid,
  LayoutDashboard,
  FileText,
  GraduationCap,
  Wrench,
  Send,
  Building2,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCurrentUserPermissions, isSectionVisible } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";

interface NavChild {
  title: string;
  href: string;
  icon?: React.ElementType;
  sectionKey: string;
  managerOnly?: boolean;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  sectionKey: string;
  children?: NavChild[];
}

const navigation: NavItem[] = [
  {
    title: "Command Center",
    href: "/command-center",
    icon: LayoutGrid,
    sectionKey: "command-center",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    sectionKey: "dashboard",
  },
  {
    title: "SOP Library",
    icon: FileText,
    sectionKey: "sops",
    children: [
      { title: "Sales", href: "/sops/sales", icon: TrendingUp, sectionKey: "sops/sales" },
      { title: "Production", href: "/sops/production", icon: Hammer, sectionKey: "sops/production" },
      { title: "Supplements", href: "/sops/supplements", icon: FileCode, sectionKey: "sops/supplements" },
      { title: "Office Admin", href: "/sops/office-admin", icon: Building2, sectionKey: "sops/office-admin" },
      { title: "Accounting", href: "/sops/accounting", icon: Calculator, sectionKey: "sops/accounting" },
      { title: "Safety / HR", href: "/sops/safety-hr", icon: Shield, sectionKey: "sops/safety-hr" },
      { title: "Templates", href: "/sops/templates-scripts", icon: FileCode, sectionKey: "sops/templates-scripts" },
    ],
  },
  {
    title: "Training",
    icon: GraduationCap,
    sectionKey: "training",
    children: [
      { title: "New Hire", href: "/training/new-hire", icon: UserPlus, sectionKey: "training/new-hire" },
      { title: "Role Training", href: "/training/role-training", icon: GraduationCap, sectionKey: "training/role-training" },
      { title: "Video Library", href: "/training/video-library", icon: Video, sectionKey: "training/video-library" },
    ],
  },
  {
    title: "Production",
    icon: Hammer,
    sectionKey: "production",
    children: [
      { title: "Warranty Tracker", href: "/warranties", icon: Shield, sectionKey: "production/warranties" },
    ],
  },
  {
    title: "Production Calendar",
    icon: Calendar,
    sectionKey: "production-calendar",
    children: [
      { title: "Build Schedule", href: "/build-schedule", icon: Hammer, sectionKey: "production-calendar/build" },
      { title: "Delivery Schedule", href: "/delivery-schedule", icon: Truck, sectionKey: "production-calendar/delivery" },
    ],
  },
  {
    title: "Tools & Systems",
    href: "/tools",
    icon: Wrench,
    sectionKey: "tools",
  },
  {
    title: "Forms & Requests",
    href: "/requests",
    icon: Send,
    sectionKey: "requests",
  },
  {
    title: "Commissions",
    href: "/commissions",
    icon: DollarSign,
    sectionKey: "commissions",
  },
  {
    title: "Company",
    href: "/company",
    icon: Building2,
    sectionKey: "company",
  },
  {
    title: "Team Directory",
    href: "/directory",
    icon: Users,
    sectionKey: "directory",
  },
  {
    title: "Subs & Vendors",
    href: "/vendors",
    icon: Truck,
    sectionKey: "vendors",
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isManager, role, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["SOP Library", "Training", "Production", "Production Calendar"]);
  const { data: userPermissions } = useCurrentUserPermissions();
  const [profile, setProfile] = useState<{ avatar_url: string | null; full_name: string | null } | null>(null);

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

    // Subscribe to profile changes
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
    return 'Employee';
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children?: { href: string }[]) =>
    children?.some((child) => location.pathname.startsWith(child.href));

  const handleNavClick = (href: string) => {
    navigate(href);
    setMobileOpen(false);
  };

  // Filter navigation based on permissions
  const filteredNavigation = navigation
    .filter((item) => isSectionVisible(item.sectionKey, userPermissions, role))
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) => {
          // Check managerOnly flag
          if (child.managerOnly && !isManager && !isAdmin) return false;
          return isSectionVisible(child.sectionKey, userPermissions, role);
        });
        // Only include parent if it has visible children
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter(Boolean) as NavItem[];

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNavigation.map((item) => (
          <div key={item.title}>
            {item.children ? (
              <Collapsible
                open={openSections.includes(item.title)}
                onOpenChange={() => toggleSection(item.title)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      isParentActive(item.children)
                        ? "nav-item-active"
                        : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary/80"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", isParentActive(item.children) && "nav-icon-glow")} />
                      {item.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        openSections.includes(item.title) && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-4 space-y-1 border-l border-primary/10 pl-2">
                  {item.children.map((child) => (
                    <button
                      key={child.href}
                      onClick={() => handleNavClick(child.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative",
                        isActive(child.href)
                          ? "nav-item-active font-medium"
                          : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary/80"
                      )}
                    >
                      {child.icon && <child.icon className={cn("w-4 h-4", isActive(child.href) && "nav-icon-glow")} />}
                      {child.title}
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <button
                onClick={() => handleNavClick(item.href!)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                  isActive(item.href!)
                    ? "nav-item-active"
                    : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary/80"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive(item.href!) && "nav-icon-glow")} />
                {item.title}
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-primary/20 space-y-2">
        {/* User info with avatar and role badge */}
        <button
          onClick={() => handleNavClick("/profile")}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200",
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

        {isAdmin && (
          <button
            onClick={() => handleNavClick("/admin")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
              isActive("/admin")
                ? "nav-item-active"
                : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary/80"
            )}
          >
            <Settings className={cn("w-4 h-4", isActive("/admin") && "nav-icon-glow")} />
            Admin Panel
          </button>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 sidebar-neon flex flex-col z-50 transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
