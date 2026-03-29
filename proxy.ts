import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

const getSupabaseEnv = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env["NEXT_PUBLIC_https://kflitogshqvmspafmxdb.supabase.co"];

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env["NEXT_PUBLIC_sb_publishable_j_GfQ93C5apK_LH4T2TpVQ_T8JuxY09"];

  if (!url || !anonKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  return { url, anonKey };
};

export const proxy = async (request: NextRequest) => {
  const { url, anonKey } = getSupabaseEnv();

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtectedPage = pathname === "/";

  if (!user && isProtectedPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    response = NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    response = NextResponse.redirect(redirectUrl);
  }

  return response;
};

export const config = {
  matcher: ["/", "/login", "/signup"],
};
