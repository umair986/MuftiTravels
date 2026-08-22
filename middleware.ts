import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  if (!isAdminRoute) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdminHome = request.nextUrl.pathname === "/admin";

  if (!user) {
    if (isAdminHome) return response;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin";
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in is not the same as authorised. RLS is the real gate (see
  // migration 008), but checking here means a non-admin gets a clear answer
  // instead of a dashboard full of failed queries.
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    const deniedUrl = request.nextUrl.clone();
    deniedUrl.pathname = "/admin";
    deniedUrl.search = "";
    deniedUrl.searchParams.set("denied", "1");
    // Already on /admin — let the page render its own "not authorised" state
    // rather than redirecting to itself forever.
    if (isAdminHome) return response;
    return NextResponse.redirect(deniedUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
