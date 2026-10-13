import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getBackendUrl } from "@/lib/session-cookie";

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
          // Kavach is invite-only for now: a new account needs the invite the join page left in a cookie
          let inviteToken: string | undefined;
          try {
            const { cookies } = await import("next/headers");
            const raw = (await cookies()).get("kavach_invite")?.value;
            if (raw && /^[0-9A-Za-z]{26}$/.test(raw)) inviteToken = raw;
          } catch {
            /* no request cookies here: sign in without one */
          }
          const res = await fetch(`${getBackendUrl()}/api/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-fingerprint": "N/A",
            },
            body: JSON.stringify({ idToken: account.id_token, ...(inviteToken ? { inviteToken } : {}) }),
          });

          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { code?: string; data?: { email?: string; name?: string } } | null;
            if (res.status === 403 && body?.code?.startsWith("invite_")) {
              // no invite: the sign-in page opens the waitlist form with what Google told us
              token.error = `Invite:${body.code}`;
              token.inviteEmail = body.data?.email;
              token.inviteName = body.data?.name;
              return token;
            }
            token.error = res.status === 403 ? "CareRecipientLogin" : "GoogleSignInFailed";
            return token;
          }

          const json = await res.json();
          if (!json?.data?.token) {
            token.error = "GoogleSignInFailed";
            return token;
          }

          token.backendToken = json.data.token;
          token.error = undefined;
          token.inviteEmail = undefined;
          token.inviteName = undefined;
          token.userId = json.data.user.userId;
          token.name = json.data.user.fullName;
          token.email = json.data.user.email;
          token.picture = json.data.user.avatarUrl;
        } catch {
          token.error = "GoogleSignInFailed";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId as string | undefined;
        session.user.name = (token.name as string | null) ?? null;
        (session.user as { email?: string | null }).email =
          (token.email as string | null) ?? null;
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/auth/post-login`;
    },
  },
});
