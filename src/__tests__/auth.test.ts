import type { UserProfile } from "@/types";
import { hasRole, isOrgAdmin, canAssignTasks, canManageOrganization, isAdminRoute } from "@/lib/rbac";
import { loginSchema, registerSchema, organizationSchema, profileSchema } from "@/lib/validations/auth";
import { taskSchema } from "@/lib/validations/task";
import { inviteMemberSchema } from "@/lib/validations/team";

const baseUser: UserProfile = {
  uid: "1",
  email: "admin@test.com",
  displayName: "Admin User",
  role: "admin",
  orgId: "org1",
  photoURL: "",
  phoneNumber: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const memberUser: UserProfile = {
  ...baseUser,
  uid: "2",
  email: "member@test.com",
  role: "team_member",
};

describe("RBAC", () => {
  const adminUser = baseUser;

  describe("hasRole", () => {
    it("should return true for matching role", () => {
      expect(hasRole(adminUser, ["admin"])).toBe(true);
      expect(hasRole(memberUser, ["team_member"])).toBe(true);
      expect(hasRole(adminUser, ["admin", "team_member"])).toBe(true);
    });

    it("should return false for non-matching role", () => {
      expect(hasRole(adminUser, ["team_member"])).toBe(false);
      expect(hasRole(memberUser, ["admin"])).toBe(false);
    });

    it("should return false for null user", () => {
      expect(hasRole(null, ["admin"])).toBe(false);
    });
  });

  describe("isOrgAdmin", () => {
    it("should return true for admin", () => {
      expect(isOrgAdmin(adminUser)).toBe(true);
    });

    it("should return false for non-admin", () => {
      expect(isOrgAdmin(memberUser)).toBe(false);
      expect(isOrgAdmin(null)).toBe(false);
    });
  });

  describe("canAssignTasks", () => {
    it("should return true only for admins", () => {
      expect(canAssignTasks(adminUser)).toBe(true);
      expect(canAssignTasks(memberUser)).toBe(false);
      expect(canAssignTasks(null)).toBe(false);
    });
  });

  describe("canManageOrganization", () => {
    it("should return true for admin of same org", () => {
      expect(canManageOrganization(adminUser, "org1")).toBe(true);
    });

    it("should return false for different org", () => {
      expect(canManageOrganization(adminUser, "org2")).toBe(false);
    });

    it("should return false for non-admin", () => {
      expect(canManageOrganization(memberUser, "org1")).toBe(false);
    });

    it("should return false for null user", () => {
      expect(canManageOrganization(null, "org1")).toBe(false);
    });
  });

  describe("isAdminRoute", () => {
    const adminRoutes = [
      "/dashboard/team",
      "/dashboard/whatsapp",
      "/dashboard/analytics",
      "/dashboard/settings",
    ];

    it("should return true for admin routes", () => {
      adminRoutes.forEach((route) => {
        expect(isAdminRoute(route)).toBe(true);
      });
    });

    it("should return true for sub-routes of admin routes", () => {
      expect(isAdminRoute("/dashboard/team/sub")).toBe(true);
      expect(isAdminRoute("/dashboard/settings/general")).toBe(true);
    });

    it("should return false for non-admin routes", () => {
      expect(isAdminRoute("/dashboard")).toBe(false);
      expect(isAdminRoute("/dashboard/tasks")).toBe(false);
      expect(isAdminRoute("/profile")).toBe(false);
    });
  });
});

describe("Auth Validations", () => {
  describe("loginSchema", () => {
    it("should accept valid email and password", () => {
      const result = loginSchema.safeParse({ email: "test@test.com", password: "password123" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = loginSchema.safeParse({ email: "not-an-email", password: "password123" });
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const result = loginSchema.safeParse({ email: "test@test.com", password: "short" });
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("should accept valid registration data", () => {
      const result = registerSchema.safeParse({
        displayName: "John Doe",
        email: "john@test.com",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject mismatched passwords", () => {
      const result = registerSchema.safeParse({
        displayName: "John Doe",
        email: "john@test.com",
        password: "password123",
        confirmPassword: "different",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("organizationSchema", () => {
    it("should accept valid org name", () => {
      const result = organizationSchema.safeParse({ name: "Acme Corp" });
      expect(result.success).toBe(true);
    });

    it("should reject short org name", () => {
      const result = organizationSchema.safeParse({ name: "AB" });
      expect(result.success).toBe(false);
    });
  });

  describe("profileSchema", () => {
    it("should accept valid profile data", () => {
      const result = profileSchema.safeParse({ displayName: "John", phoneNumber: "+1234567890" });
      expect(result.success).toBe(true);
    });

    it("should accept optional phone number", () => {
      const result = profileSchema.safeParse({ displayName: "John" });
      expect(result.success).toBe(true);
    });
  });
});

describe("Task Validations", () => {
  describe("taskSchema", () => {
    it("should accept valid task data", () => {
      const result = taskSchema.safeParse({
        title: "Fix the bug",
        description: "Database connection issue",
        priority: "high",
        status: "todo",
        dueDate: "2026-10-25",
        labels: "bug, database",
      });
      expect(result.success).toBe(true);
    });

    it("should reject short title", () => {
      const result = taskSchema.safeParse({
        title: "ab",
        priority: "medium",
        status: "todo",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Team Validations", () => {
  describe("inviteMemberSchema", () => {
    it("should accept valid invite data", () => {
      const result = inviteMemberSchema.safeParse({
        email: "colleague@test.com",
        role: "team_member",
      });
      expect(result.success).toBe(true);
    });

    it("should accept admin role", () => {
      const result = inviteMemberSchema.safeParse({
        email: "admin@test.com",
        role: "admin",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = inviteMemberSchema.safeParse({
        email: "not-an-email",
        role: "team_member",
      });
      expect(result.success).toBe(false);
    });
  });
});
