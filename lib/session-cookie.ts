export const SESSION_COOKIE = "kavach_session";

function useSecureCookies() {
  if (process.env.NODE_ENV === "production") return true;
  return process.env.AUTH_URL?.startsWith("https://") ?? false;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: useSecureCookies(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
};

export function getBackendUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
}
