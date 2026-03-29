// AI Todo Manager 서비스의 로그인 페이지 화면을 구성하는 페이지 컴포넌트입니다.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

/**
 * 이메일/비밀번호 기반 로그인 폼과 서비스 소개를 제공하는 로그인 페이지입니다.
 */
const LoginPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/");
          router.refresh();
        }
      } catch {
        // 세션 확인 실패 시에는 로그인 폼을 그대로 표시합니다.
      }
    };

    void run();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("이메일을 입력해 주세요.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setErrorMessage("올바른 이메일 형식을 입력해 주세요.");
      return;
    }
    if (!password) {
      setErrorMessage("비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error || !data.session) {
        setErrorMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage(
        "로그인 중 문제가 발생했습니다. 네트워크 상태를 확인해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* 서비스 로고 및 간단 소개 */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex h-10 items-center rounded-full bg-primary/10 px-4 text-xs font-semibold text-primary">
            AI Todo Manager
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            AI가 도와주는 스마트한 할 일 관리
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            자연어로 할 일을 적으면 AI가 자동으로 구조화해 주고, 오늘 해야 할
            일과 생산성을 한눈에 보여드립니다.
          </p>
        </div>

        {/* 로그인 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">로그인</CardTitle>
            <CardDescription className="text-xs">
              AI Todo Manager 계정으로 로그인하고, 어디서든 할 일을 이어서
              관리하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner className="mr-2" />}
                {isSubmitting ? "로그인 중..." : "이메일로 로그인"}
              </Button>
            </form>

            {errorMessage && (
              <p className="mt-4 text-xs text-destructive" role="alert">
                {errorMessage}
              </p>
            )}

            <div className="mt-6 text-center text-xs text-muted-foreground">
              아직 계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                회원가입하러 가기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
