// Supabase 인증 상태를 상단에서 표시하고 로그아웃을 제공하는 헤더 컴포넌트입니다.

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * 전역 헤더에서 인증 상태를 실시간으로 반영하고 로그아웃을 처리합니다.
 */
export const AuthHeader = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user.email ?? null);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    void load();
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage("로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setUserEmail(null);
      router.replace("/login");
      router.refresh();
    } catch {
      setErrorMessage("로그아웃에 실패했습니다. 네트워크 상태를 확인해 주세요.");
    }
  };

  if (isAuthPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-full bg-primary/10 px-4 text-xs font-semibold text-primary"
          >
            AI Todo Manager
          </Link>
          <div className="hidden text-sm text-muted-foreground sm:block">
            오늘의 할 일을 빠르게 정리하고, AI로 요약까지 받아보세요.
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-foreground">로그인됨</div>
                <div className="text-[11px] text-muted-foreground">{userEmail}</div>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
              로그인
            </Link>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-3">
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        </div>
      )}
    </header>
  );
};

