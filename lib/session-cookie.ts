export const SESSION_COOKIE = "kavach_session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
};

export function getBackendUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
}
