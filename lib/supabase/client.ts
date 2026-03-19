// 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트를 생성하는 유틸입니다.

"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase 환경 변수를 안전하게 읽어옵니다.
 * (현재 프로젝트의 `.env.local` 변수명이 표준 키와 다를 수 있어, 여러 키를 순차적으로 확인합니다.)
 */
const getSupabaseEnv = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env["NEXT_PUBLIC_https://kflitogshqvmspafmxdb.supabase.co"];

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env["NEXT_PUBLIC_sb_publishable_j_GfQ93C5apK_LH4T2TpVQ_T8JuxY09"];

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. `.env.local`의 URL/KEY 값을 확인해 주세요."
    );
  }

  return { url, anonKey };
};

/**
 * 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트를 생성합니다.
 */
export const createClient = () => {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
};

