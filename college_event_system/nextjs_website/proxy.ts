import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/events/(.*)",
  "/api/public/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();

  // Redirect unauthenticated users to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const metadata = (sessionClaims?.metadata as Record<string, string>) ?? {};
  const role = metadata.role as string | undefined;
  const department = metadata.department as string | undefined;

  const url = req.nextUrl.pathname;

  // Redirect /dashboard root to role-specific dashboard
  if (url === "/dashboard" || url === "/dashboard/") {
    if (role && department) {
      return NextResponse.redirect(
        new URL(`/dashboard/${department}/${role}`, req.url)
      );
    }
    // Profile incomplete — send to onboarding to collect department
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Enforce role-based route access on dashboard routes
  if (url.startsWith("/dashboard/")) {
    const segments = url.split("/").filter(Boolean);
    // URL structure: /dashboard/[dept]/[role]/...
    // segments[0] = "dashboard", segments[1] = dept, segments[2] = role
    const urlDept = segments[1];
    const urlRole = segments[2];

    // Super admin can access any department
    if (role === "super_admin") {
      return NextResponse.next();
    }

    // Block cross-department access
    if (urlDept && department && urlDept !== department) {
      return NextResponse.redirect(
        new URL(`/dashboard/${department}/${role}`, req.url)
      );
    }

    // Block wrong-role access
    if (urlRole && role && urlRole !== role) {
      return NextResponse.redirect(
        new URL(`/dashboard/${department}/${role}`, req.url)
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets with extensions
     */
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
