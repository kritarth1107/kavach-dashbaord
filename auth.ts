import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import {
  getBackendUrl,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session-cookie";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "google") {
        return Boolean(account.id_token);
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider === "google" && account.id_token) {
        try {
          const res = await fetch(`${getBackendUrl()}/api/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-fingerprint": "N/A",
            },
            body: JSON.stringify({ idToken: account.id_token }),
          });

          if (res.ok) {
            const json = await res.json();
            const cookieStore = await cookies();
            cookieStore.set(
              SESSION_COOKIE,
              json.data.token,
              sessionCookieOptions,
            );
            token.userId = json.data.user.userId;
            token.name = json.data.user.fullName;
            token.email = json.data.user.email;
            token.picture = json.data.user.avatarUrl;
          }
        } catch {
          return token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId;
        session.user.name = token.name ?? null;
        (session.user as { email?: string | null }).email = token.email ?? null;
        session.user.image = token.picture ?? null;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
});
