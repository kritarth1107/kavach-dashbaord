import "next-auth/jwt";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    backendToken?: string;
    error?: string;
    /** Google sign-up refused for want of an invite: prefill for the waitlist form. */
    inviteEmail?: string;
    inviteName?: string;
  }
}
