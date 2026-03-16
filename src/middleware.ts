import { withAuth } from "next-auth/middleware";

/**
 * Protects all /admin/* routes except /admin/login.
 * Webhook and WhatsApp API routes are excluded — they use their own auth.
 */
export default withAuth({
  pages: {
    signIn: "/admin/login",
  },
});

export const config = {
  matcher: ["/admin/((?!login).*)"],
};
