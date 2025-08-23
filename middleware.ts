// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Add any routes you want to allow without auth here:
const isPublicRoute = createRouteMatcher([
  "/",
  "/lobby",                // if you want lobby public; remove if not
  "/api/ai/(.*)",          // <-- allow your AI routes
  "/favicon.ico",
  "/(.*).png",
  "/(.*).jpg",
  "/(.*).jpeg",
  "/(.*).svg",
  "/(.*).webmanifest",
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip protection for public routes
  if (isPublicRoute(req)) return;

  // Protect everything else
  await auth.protect();
});

// Keep your matcher wide but skip Next internals & static assets
export const config = {
  matcher: [
    // Skip _next, assets, and file extensions
    "/((?!_next|.*\\..*).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
