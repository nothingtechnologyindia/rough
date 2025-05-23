import { clerkMiddleware, redirectToSignIn } from "@clerk/nextjs/server";
import { permit } from "./app/api/authorizer";
import { NextResponse } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/nextjs/middleware for more information about configuring your middleware
export default clerkMiddleware({
  publicRoutes: ["/api/account/dashboard/health-benefits"],
  afterAuth: async ({ userId, session, isPublicRoute, ...auth }, { nextUrl: { pathname }, url }) => {
    const { protocol, host } = new URL(process.env.APP_URL ? process.env.APP_URL : url);

    // handle users who aren't authenticated
    if (!userId && !isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: `${protocol}//${host}${pathname}` });
    }
    const scopeUrl = `${process.env.PERMIT_API_URL || "https://api.permit.io"}/v2/api-key/scope`;
    const { project_id, environment_id } = await fetch(scopeUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.PERMIT_SDK_KEY}`,
        'Content-Type': 'application/json',
      }
    }).then(res => res.json());

    const user = await fetch(`${process.env.PERMIT_API_URL || "https://api.permit.io"}/v2/facts/${project_id}/${environment_id}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PERMIT_SDK_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (user.status === 200 && pathname.indexOf('/welcome') === -1) {
      return;
    }

    if (user.status === 200 && pathname.indexOf('/welcome') >= 0) {
      return NextResponse.redirect(`${protocol}//${host}`);
    }

    if (pathname.indexOf('/welcome') >= 0) {
      return;
    }

    if (!isPublicRoute) {
      console.log('user is not authenticated and not on welcome page');
      return NextResponse.redirect(`${protocol}//${host}/welcome`);
    }
  },
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
