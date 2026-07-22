import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const organizationSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Organization name must be at least 3 characters." }),
});

export const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." }),
  phoneNumber: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
