import type { UserProfile, UserRole } from "@/types";

export const ADMIN_DASHBOARD_ROUTES = [
  "/dashboard/team",
  "/dashboard/whatsapp",
  "/dashboard/analytics",
  "/dashboard/settings",
];

export function hasRole(user: UserProfile | null, roles: UserRole[]): boolean {
  return Boolean(user && roles.includes(user.role));
}

export function isOrgAdmin(user: UserProfile | null): boolean {
  return hasRole(user, ["admin"]);
}

export function canManageOrganization(user: UserProfile | null, orgId?: string): boolean {
  return Boolean(user && orgId && user.orgId === orgId && user.role === "admin");
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_DASHBOARD_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
