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
  }
}
