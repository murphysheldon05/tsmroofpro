import { formatDisplayName } from "@/lib/displayName";

export interface WeeklyKpiCard {
  key:
    | "sales-rep"
    | "sales-manager"
    | "office-admin"
    | "operations"
    | "accounting"
    | "production"
    | "supplement";
  title: string;
  subtitle: string;
  reviewedBy: string;
  href: string;
  assignedNames?: string[];
  assignedRoles?: string[];
}

export const WEEKLY_KPI_CARDS: WeeklyKpiCard[] = [
  {
    key: "sales-rep",
    title: "Sales Reps",
    subtitle: "Assigned sales rep only",
    reviewedBy: "Sales Managers -> Manny",
    href: "/kpi-scorecards/sales-rep",
    assignedRoles: ["sales_rep"],
  },
  {
    key: "sales-manager",
    title: "Sales Managers",
    subtitle: "Jordan Pollei, Conrad Demecs",
    reviewedBy: "Sheldon + Manny",
    href: "/kpi-scorecards/sales-manager",
    assignedNames: ["Jordan Pollei", "Conrad Demecs"],
  },
  {
    key: "office-admin",
    title: "Office Admin",
    subtitle: "Jayden Abramsen",
    reviewedBy: "Sheldon + Manny",
    href: "/kpi-scorecards/office-admin",
    assignedNames: ["Jayden Abramsen"],
  },
  {
    key: "operations",
    title: "Operations & Compliance",
    subtitle: "Manny Madrid",
    reviewedBy: "Sheldon (tracking only)",
    href: "/kpi-scorecards/operations",
    assignedNames: ["Manny Madrid"],
  },
  {
    key: "accounting",
    title: "Accounting",
    subtitle: "Renice",
    reviewedBy: "Courtney + Sheldon",
    href: "/kpi-scorecards/accounting",
    assignedNames: ["Renice"],
  },
  {
    key: "production",
    title: "Production",
    subtitle: "Tim Brown",
    reviewedBy: "Manny + Sheldon",
    href: "/kpi-scorecards/production",
    assignedNames: ["Tim Brown"],
  },
  {
    key: "supplement",
    title: "Supplement",
    subtitle: "Supplement Coordinator",
    reviewedBy: "Manny + Sheldon",
    href: "/kpi-scorecards/supplement",
  },
];

export function isWeeklyKpiManagerRole(role: string | null | undefined) {
  return role === "admin" || role === "manager" || role === "sales_manager";
}

function normalizeName(name?: string | null, email?: string | null) {
  return formatDisplayName(name, email).trim().toLowerCase();
}

export function getAccessibleWeeklyKpiCards(params: {
  role: string | null | undefined;
  fullName?: string | null;
  email?: string | null;
}) {
  const { role, fullName, email } = params;

  if (isWeeklyKpiManagerRole(role)) {
    return WEEKLY_KPI_CARDS;
  }

  const normalizedName = normalizeName(fullName, email);

  return WEEKLY_KPI_CARDS.filter((card) => {
    if (card.assignedRoles?.includes(role ?? "")) {
      return true;
    }

    if (card.assignedNames?.some((name) => normalizeName(name) === normalizedName)) {
      return true;
    }

    return false;
  });
}

export function canAccessWeeklyKpiRoute(params: {
  href: string;
  role: string | null | undefined;
  fullName?: string | null;
  email?: string | null;
}) {
  return getAccessibleWeeklyKpiCards(params).some((card) => card.href === params.href);
}
