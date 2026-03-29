"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { Todo, TodoPriority } from "@/components/todo/TodoCard";
import { TodoForm } from "@/components/todo/TodoForm";
import { TodoList } from "@/components/todo/TodoList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

type TodoFormValues = {
  title: string;
  description: string;
  dueDate: string;
  priority: TodoPriority;
  category: string;
  completed: boolean;
};

type TodoStatusFilter = "all" | "completed" | "incomplete";
type TodoPriorityFilter = "all" | TodoPriority;
type TodoSortKey = "createdDate" | "dueDate" | "priority" | "title";

type AiAnalysisResult = {
  summary: string;
  urgentTasks?: string[];
  insights?: string[];
  recommendations?: string[];
};

type TodoRow = {
  id: string | number;
  user_id: string;
  title: string;
  description?: string | null;
  created_date?: string | null;
  due_date?: string | null;
  priority?: string | null;
  category?: string[] | null;
  completed?: boolean | null;
};

const HomePage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TodoStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<TodoPriorityFilter>("all");
  const [sortKey, setSortKey] = useState<TodoSortKey>("createdDate");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPeriod, setAiPeriod] = useState<"today" | "week">("today");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editingTodo = useMemo(() => {
    if (!editingTodoId) return undefined;
    return todos.find((t) => t.id === editingTodoId);
  }, [editingTodoId, todos]);

  const parseTodoRow = (row: TodoRow): Todo => ({
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    description: row.description ?? "",
    createdDate: row.created_date
      ? new Date(row.created_date).toISOString().slice(0, 16).replace("T", " ")
      : "",
    dueDate: row.due_date
      ? new Date(row.due_date).toISOString().slice(0, 16)
      : "",
    priority: (row.priority as TodoPriority) ?? "medium",
    category: Array.isArray(row.category) ? row.category : [],
    completed: Boolean(row.completed),
  });

  const fetchTodos = useCallback(async (currentUserId: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_date", { ascending: false });

      if (error) {
        setErrorMessage(`할 일 목록 로딩 실패: ${error.message}`);
        return;
      }
      setTodos(data ? data.map(parseTodoRow) : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "알 수 없는 에러";
      setErrorMessage(`네트워크 오류: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. 초기 렌더링 시 유저 체크 및 생성 로직
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();

        if (error || !data?.session?.user?.id) {
          setStatusMessage("로그인 후 할 일을 관리해주세요.");
          setUserId(null);
          setTodos([]);
          return;
        }

        const user = data.session.user;

        // 🚨 핵심 수정: .single() 대신 .maybeSingle() 사용!
        // 데이터가 없어도 에러를 뱉지 않고 null을 반환하게 함
        const { data: userProfile } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!userProfile) {
          await supabase.from("users").insert([
            {
              id: user.id,
              email: user.email || "",
            },
          ]);
        }

        setUserId(user.id);
        await fetchTodos(user.id);
      } catch {
        setErrorMessage("로그인 상태를 확인할 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [fetchTodos]);

  const periodStats = useMemo(() => {
    if (!isMounted)
      return {
        total: 0,
        completed: 0,
        rate: 0,
        remaining: [],
        weekDays: [0, 0, 0, 0, 0, 0, 0],
      };

    const now = new Date();
    const filtered = todos.filter((todo) => {
      if (!todo.dueDate) return aiPeriod === "week";
      const due = new Date(todo.dueDate);
      if (aiPeriod === "today") {
        return due.toDateString() === now.toDateString();
      } else {
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= -1 && diffDays <= 7;
      }
    });

    const completed = filtered.filter((t) => t.completed).length;
    const total = filtered.length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    const remaining = filtered
      .filter((t) => !t.completed)
      .sort((a, b) => {
        const w = (p: TodoPriority) =>
          p === "high" ? 3 : p === "medium" ? 2 : 1;
        return w(b.priority) - w(a.priority);
      });

    const weekDays = [0, 0, 0, 0, 0, 0, 0];
    if (aiPeriod === "week") {
      filtered
        .filter((t) => t.completed)
        .forEach((t) => {
          if (t.dueDate) {
            const day = new Date(t.dueDate).getDay();
            if (!isNaN(day)) weekDays[day]++;
          }
        });
    }

    return { total, completed, rate, remaining, weekDays };
  }, [todos, aiPeriod, isMounted]);

  const handleAnalyzeTodos = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const now = new Date();
      const filteredForAi = todos.filter((todo) => {
        if (!todo.dueDate) return aiPeriod === "week";
        const due = new Date(todo.dueDate);
        if (aiPeriod === "today") {
          return due.toDateString() === now.toDateString();
        } else {
          const diffTime = due.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= -1 && diffDays <= 7;
        }
      });

      if (filteredForAi.length === 0) {
        setAiError(
          `분석할 ${aiPeriod === "today" ? "오늘의" : "이번 주"} 할 일이 없어!`,
        );
        setAiLoading(false);
        return;
      }

      const payload = filteredForAi.map((t) => ({
        title: t.title,
        completed: t.completed,
        priority: t.priority,
        dueDate: t.dueDate,
        category: t.category,
      }));

      const res = await fetch("/api/analyze-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todos: payload,
          period: aiPeriod,
          currentTime: now.toISOString(),
        }),
      });

      if (!res.ok) throw new Error("분석 실패");
      const data = await res.json();
      setAiResult(data.result);
    } catch {
      setAiError("앗, AI 분석 중에 일시적인 문제가 생겼어.");
    } finally {
      setAiLoading(false);
    }
  };

  const renderAnalysisContent = () => {
    if (aiLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            할 일 데이터를 꼼꼼히 분석하고 있어... 잠시만 기다려 줘! ⏳
          </p>
        </div>
      );
    }

    if (aiError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <AlertTriangle className="w-10 h-10 text-destructive/80" />
          <p className="text-sm text-muted-foreground">{aiError}</p>
          <Button
            variant="outline"
            onClick={handleAnalyzeTodos}
            className="gap-2 mt-2"
          >
            <RefreshCw className="w-4 h-4" /> 다시 분석하기
          </Button>
        </div>
      );
    }

    if (!aiResult) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-muted/30 rounded-lg border border-dashed my-4">
          <p className="text-sm text-muted-foreground text-center px-4">
            {aiPeriod === "today"
              ? "오늘 하루의 진행 상황과 집중할 작업을 분석해 줄게!"
              : "이번 주 생산성 패턴과 다음 주 계획을 세워볼까?"}
          </p>
          <Button onClick={handleAnalyzeTodos} className="gap-2">
            ✨ {aiPeriod === "today" ? "오늘의 요약 보기" : "이번 주 요약 보기"}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 mt-4">
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary text-center font-medium leading-relaxed">
          {aiResult.summary || "분석 완료! 아래 지표를 확인해 줘."}
        </div>

        {aiPeriod === "today" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col justify-center space-y-4 bg-card border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" /> 오늘의 달성률
              </h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-extrabold text-primary">
                  {periodStats.rate}%
                </span>
                <span className="text-sm text-muted-foreground mb-1">
                  {periodStats.total}개 중 {periodStats.completed}개 완료
                </span>
              </div>
              <Progress value={periodStats.rate} className="h-3" />
            </div>

            <div className="bg-card border rounded-lg p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-4 h-4" /> 남은 핵심 작업
              </h3>
              {periodStats.remaining.length > 0 ? (
                <div className="space-y-2 max-h-27.5 overflow-y-auto pr-2">
                  {periodStats.remaining.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                    >
                      <span className="truncate pr-2">{t.title}</span>
                      <Badge
                        variant={
                          t.priority === "high" ? "destructive" : "secondary"
                        }
                        className="shrink-0 text-[10px] px-1.5 py-0"
                      >
                        {t.priority}
                      </Badge>
                    </div>
                  ))}
                  {periodStats.remaining.length > 3 && (
                    <div className="text-xs text-center text-muted-foreground pt-1">
                      외 {periodStats.remaining.length - 3}개 더 남았어!
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pt-2">
                  남은 작업이 하나도 없네! 완벽해 👏
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-6 text-muted-foreground">
              주간 생산성 흐름 (요일별 완료량)
            </h3>
            <div className="flex items-end justify-between h-32 gap-2 mt-2 px-2 md:px-8">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => {
                const count = periodStats.weekDays[idx];
                const max = Math.max(...periodStats.weekDays, 1);
                const height = `${(count / max) * 100}%`;
                const isToday = isMounted && new Date().getDay() === idx;

                return (
                  <div
                    key={day}
                    className="flex flex-col items-center gap-2 flex-1 group"
                  >
                    <div className="w-full max-w-10 bg-muted rounded-t-md relative flex items-end justify-center h-full overflow-hidden">
                      <div
                        className={`w-full rounded-t-md transition-all duration-500 ease-out ${isToday ? "bg-primary" : "bg-primary/40 group-hover:bg-primary/60"}`}
                        style={{ height: count > 0 ? height : "4px" }}
                      />
                    </div>
                    <span
                      className={`text-xs ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {aiResult.urgentTasks && aiResult.urgentTasks.length > 0 && (
          <Alert
            variant="destructive"
            className="bg-destructive/5 border-destructive/20"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              <span className="block mb-1 text-xs opacity-80">
                놓치면 안 될 긴급 작업! 🚨
              </span>
              {aiResult.urgentTasks.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-none border-dashed bg-transparent">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" /> 발견한 패턴 &
                인사이트 💡
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ul className="space-y-3">
                {aiResult.insights && aiResult.insights.length > 0 ? (
                  aiResult.insights.map((insight, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-amber-500/50 mt-0.5">•</span>
                      <span className="leading-snug">{insight}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">
                    특이한 패턴은 아직 없었어!
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-none border-dashed bg-transparent">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" /> 다음 스텝 추천
                🎯
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ul className="space-y-3">
                {aiResult.recommendations &&
                aiResult.recommendations.length > 0 ? (
                  aiResult.recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-emerald-500/50 mt-0.5">•</span>
                      <span className="leading-snug">{rec}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">
                    현재 페이스를 그대로 유지해 보자!
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const filteredTodos = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesQuery = (todo: Todo) =>
      !q ||
      todo.title.toLowerCase().includes(q) ||
      (todo.description ?? "").toLowerCase().includes(q);
    const matchesStatus = (todo: Todo) =>
      statusFilter === "all"
        ? true
        : statusFilter === "completed"
          ? todo.completed
          : !todo.completed;
    const matchesPriority = (todo: Todo) =>
      priorityFilter === "all" ? true : todo.priority === priorityFilter;
    const sortTodos = (a: Todo, b: Todo) => {
      if (sortKey === "createdDate")
        return b.createdDate.localeCompare(a.createdDate);
      if (sortKey === "dueDate")
        return (b.dueDate ?? "").localeCompare(a.dueDate ?? "");
      if (sortKey === "title") return a.title.localeCompare(b.title);
      const weight = (p: TodoPriority) =>
        p === "high" ? 3 : p === "medium" ? 2 : 1;
      return weight(b.priority) - weight(a.priority);
    };
    return todos
      .filter(matchesQuery)
      .filter(matchesStatus)
      .filter(matchesPriority)
      .slice()
      .sort(sortTodos);
  }, [priorityFilter, query, sortKey, statusFilter, todos]);

  const handleToggleComplete = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data: existingTodo } = await supabase
        .from("todos")
        .select("completed")
        .eq("id", id)
        .single();
      if (!existingTodo) return;
      await supabase
        .from("todos")
        .update({ completed: !existingTodo.completed })
        .eq("id", id);
      await fetchTodos(userId);
    } catch {
      // 오류 무시 또는 처리
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingTodoId(id);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!window.confirm("정말로 이 할 일을 삭제하시겠습니까?")) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from("todos").delete().eq("id", id);
      setEditingTodoId((prev) => (prev === id ? null : prev));
      await fetchTodos(userId);
      setStatusMessage("할 일이 삭제되었습니다.");
    } catch {
      // 오류 무시 또는 처리
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  // 2. 할 일 저장 로직 (maybeSingle 적용)
  const handleSubmitTodo = async (values: TodoFormValues) => {
    if (!userId) {
      alert("로그인이 필요해!");
      return;
    }

    const category = values.category
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const supabase = createClient();

      // 🚨 핵심 수정: .single() 대신 .maybeSingle() 사용!
      const { data: userProfile } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!userProfile) {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user?.email || "";

        const { error: insertUserErr } = await supabase
          .from("users")
          .insert([{ id: userId, email }]);

        if (insertUserErr) {
          const msg = `⚠ 유저 프로필 생성 실패! (DB 권한 문제일 수 있음)\n원인: ${insertUserErr.message}`;
          alert(msg);
          setErrorMessage(msg);
          setLoading(false);
          return;
        }
      }

      if (editingTodoId) {
        const { error } = await supabase
          .from("todos")
          .update({
            title: values.title,
            description: values.description,
            due_date: values.dueDate || null,
            priority: values.priority,
            category,
            completed: values.completed,
          })
          .eq("id", editingTodoId);

        if (error) {
          const msg = `⚠ 수정 실패!\n원인: ${error.message}`;
          alert(msg);
          setErrorMessage(msg);
          return;
        }

        setEditingTodoId(null);
        setStatusMessage("할 일 정보가 업데이트되었습니다.");
      } else {
        const now = new Date().toISOString();
        const { error } = await supabase.from("todos").insert([
          {
            user_id: userId,
            title: values.title,
            description: values.description,
            created_date: now,
            due_date: values.dueDate || null,
            priority: values.priority,
            category,
            completed: values.completed,
          },
        ]);

        if (error) {
          const msg = `⚠ 할 일 추가 실패!\n원인: ${error.message}\n코드: ${error.code}`;
          alert(msg);
          setErrorMessage(msg);
          return;
        }
        setStatusMessage("새 할 일이 추가되었습니다.");
      }
      await fetchTodos(userId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "알 수 없는 에러";
      alert(`네트워크 오류: ${msg}`);
      setErrorMessage(`네트워크 오류: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {(errorMessage || statusMessage) && (
          <div className="mb-4 rounded-md border border-border bg-popover p-3 text-sm">
            {errorMessage && (
              <p className="text-destructive font-bold whitespace-pre-line">
                ⚠ {errorMessage}
              </p>
            )}
            {statusMessage && !errorMessage && (
              <p className="text-foreground">✅ {statusMessage}</p>
            )}
          </div>
        )}

        {!userId ? (
          <Card className="mb-6">
            <CardContent>
              <p className="text-sm text-muted-foreground mt-6">
                로그인된 사용자를 찾을 수 없어. 로그인 후 다시 시도해 줘!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6 overflow-hidden">
              <Tabs
                value={aiPeriod}
                onValueChange={(v) => {
                  setAiPeriod(v as "today" | "week");
                  setAiResult(null);
                  setAiError(null);
                }}
              >
                <CardHeader className="pb-3 bg-muted/20 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    ✨ AI 요약 및 분석
                  </CardTitle>
                  <TabsList>
                    <TabsTrigger value="today">오늘의 요약</TabsTrigger>
                    <TabsTrigger value="week">이번 주 요약</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="p-6">
                  <TabsContent
                    value="today"
                    className="m-0 focus-visible:outline-none"
                  >
                    {renderAnalysisContent()}
                  </TabsContent>
                  <TabsContent
                    value="week"
                    className="m-0 focus-visible:outline-none"
                  >
                    {renderAnalysisContent()}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">검색 · 필터 · 정렬</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-6">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="제목 또는 설명으로 검색"
                      aria-label="할 일 검색"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      value={statusFilter}
                      onValueChange={(v) =>
                        setStatusFilter(v as TodoStatusFilter)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="상태" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="incomplete">미완료</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      value={priorityFilter}
                      onValueChange={(v) =>
                        setPriorityFilter(v as TodoPriorityFilter)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="우선순위" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="high">높음</SelectItem>
                        <SelectItem value="medium">보통</SelectItem>
                        <SelectItem value="low">낮음</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      value={sortKey}
                      onValueChange={(v) => setSortKey(v as TodoSortKey)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="정렬" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdDate">생성일순</SelectItem>
                        <SelectItem value="dueDate">마감일순</SelectItem>
                        <SelectItem value="priority">우선순위순</SelectItem>
                        <SelectItem value="title">제목순</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <section className="lg:col-span-5">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  {editingTodo ? "할 일 편집" : "새 할 일 추가"}
                </h2>
                <TodoForm
                  initialTodo={editingTodo}
                  onSubmit={handleSubmitTodo}
                  onCancel={editingTodo ? handleCancelEdit : undefined}
                  submitLabel={editingTodo ? "할 일 수정" : "할 일 추가"}
                />
              </section>
              <section className="lg:col-span-7">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  할 일 목록
                </h2>
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    로딩 중...
                  </div>
                ) : (
                  <TodoList
                    todos={filteredTodos}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    emptyMessage="조건에 맞는 할 일이 없어. 검색어나 필터를 바꿔 봐!"
                  />
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default HomePage;
