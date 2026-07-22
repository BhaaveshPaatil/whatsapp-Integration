import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  role: z.enum(["admin", "team_member"]),
  teamName: z.string().optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
