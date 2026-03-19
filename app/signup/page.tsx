// AI Todo Manager 서비스의 회원가입 페이지 화면을 구성하는 페이지 컴포넌트입니다.

"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type SignupValues = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

/**
 * 이름/이메일/비밀번호 기반 회원가입 폼과 서비스 소개를 제공하는 회원가입 페이지입니다.
 */
const SignupPage = () => {
  const [values, setValues] = useState<SignupValues>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange =
    (field: keyof SignupValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
    };

    if (!trimmed.name) {
      alert("이름을 입력해 주세요.");
      return;
    }
    if (!trimmed.email) {
      setErrorMessage("이메일을 입력해 주세요.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed.email)) {
      setErrorMessage("올바른 이메일 형식을 입력해 주세요.");
      return;
    }
    if (!trimmed.password) {
      setErrorMessage("비밀번호를 입력해 주세요.");
      return;
    }
    if (trimmed.password.length < 8) {
      setErrorMessage("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }
    if (trimmed.password !== trimmed.passwordConfirm) {
      setErrorMessage("비밀번호가 서로 일치하지 않습니다. 다시 확인해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: trimmed.email,
        password: trimmed.password,
        options: {
          data: {
            name: trimmed.name,
          },
        },
      });

      if (error) {
        // Supabase 에러 메시지를 사용자 친화적인 문구로 매핑
        if (error.message.toLowerCase().includes("email")) {
          setErrorMessage("이메일 주소를 다시 확인해 주세요. 이미 가입된 이메일일 수도 있습니다.");
        } else if (error.message.toLowerCase().includes("password")) {
          setErrorMessage("비밀번호 조건을 다시 확인해 주세요.");
        } else {
          setErrorMessage("회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        }
        return;
      }

      setSuccessMessage("회원가입이 완료되었습니다. 이메일로 전송된 확인 메일을 확인해 주세요.");
    } catch {
      setErrorMessage("일시적인 오류가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
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
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">회원가입</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            계정을 만들면 할 일을 저장하고, AI로 빠르게 정리하며, 일일/주간 생산성 요약을 받아볼 수 있어요.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">새 계정 만들기</CardTitle>
            <CardDescription className="text-xs">
              이름과 이메일을 입력하고 비밀번호를 설정해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="예: 홍길동"
                  value={values.name}
                  onChange={handleChange("name")}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={handleChange("email")}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호를 입력하세요"
                  value={values.password}
                  onChange={handleChange("password")}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="password-confirm">비밀번호 재입력</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={values.passwordConfirm}
                  onChange={handleChange("passwordConfirm")}
                  required
                />
              </div>

              <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
                {isSubmitting ? "회원가입 진행 중..." : "회원가입"}
              </Button>
            </form>

            {errorMessage && (
              <p className="mt-4 text-xs text-destructive" role="alert">
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p className="mt-4 text-xs text-emerald-600" role="status">
                {successMessage}
              </p>
            )}

            <div className="mt-6 text-center text-xs text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                로그인하러 가기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;

