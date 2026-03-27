"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import { Todo, TodoPriority } from "@/components/todo/TodoCard";
import { TodoForm } from "@/components/todo/TodoForm";
import { TodoList } from "@/components/todo/TodoList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

// Supabase row 타입 정의 추가
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
        console.error(
          "fetchTodos 에러 상세:",
          error.message,
          error.details,
          error.code,
        );
        setErrorMessage("할 일 목록을 불러오는 중 오류가 발생했습니다.");
        return;
      }
      if (!data) {
        setTodos([]);
        return;
      }

      setTodos(data.map(parseTodoRow));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("fetchTodos 네트워크 에러:", errMsg);
      setErrorMessage("네트워크 오류로 할 일을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("세션 확인 에러:", error.message);
          setErrorMessage("세션을 확인하는 중 오류가 발생했습니다.");
          return;
        }
        const user = data?.session?.user;
        if (!user?.id) {
          setStatusMessage("로그인 후 할 일을 관리해주세요.");
          setUserId(null);
          setTodos([]);
          return;
        }
        setUserId(user.id);
        await fetchTodos(user.id);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("초기화 네트워크 에러:", errMsg);
        setErrorMessage(
          "로그인 상태를 확인할 수 없습니다. 페이지를 새로고침 해주세요.",
        );
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [fetchTodos]);

  const filteredTodos = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matchesQuery = (todo: Todo) => {
      if (!q) return true;
      return (
        todo.title.toLowerCase().includes(q) ||
        (todo.description ?? "").toLowerCase().includes(q)
      );
    };

    const matchesStatus = (todo: Todo) => {
      if (statusFilter === "all") return true;
      return statusFilter === "completed" ? todo.completed : !todo.completed;
    };

    const matchesPriority = (todo: Todo) => {
      if (priorityFilter === "all") return true;
      return todo.priority === priorityFilter;
    };

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
    if (!userId) {
      setErrorMessage("로그인 정보가 없어서 상태를 변경할 수 없습니다.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data: existingTodo, error: fetchError } = await supabase
        .from("todos")
        .select("completed")
        .eq("id", id)
        .single();

      if (fetchError || !existingTodo) {
        console.error("할 일 조회 에러:", fetchError?.message);
        setErrorMessage("할 일을 찾을 수 없습니다.");
        return;
      }

      const { error } = await supabase
        .from("todos")
        .update({ completed: !existingTodo.completed })
        .eq("id", id);

      if (error) {
        console.error(
          "완료 상태 업데이트 에러:",
          error.message,
          error.details,
          error.code,
        );
        setErrorMessage("완료 상태를 변경하는 동안 오류가 발생했습니다.");
        return;
      }

      await fetchTodos(userId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("완료 상태 토글 네트워크 에러:", errMsg);
      setErrorMessage("네트워크 오류로 진행할 수 없습니다.");
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
    if (!userId) {
      setErrorMessage("로그인 정보가 없어서 삭제할 수 없습니다.");
      return;
    }
    const confirmed = window.confirm("정말로 이 할 일을 삭제하시겠습니까?");
    if (!confirmed) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("todos").delete().eq("id", id);

      if (error) {
        console.error(
          "삭제 에러 상세:",
          error.message,
          error.details,
          error.code,
        );
        setErrorMessage("삭제 중 오류가 발생했습니다.");
        return;
      }
      setEditingTodoId((prev) => (prev === id ? null : prev));
      await fetchTodos(userId);
      setStatusMessage("할 일이 삭제되었습니다.");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("삭제 네트워크 에러:", errMsg);
      setErrorMessage("네트워크 오류로 삭제할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTodo = async (values: TodoFormValues) => {
    if (!userId) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }

    const category = values.category
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
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
          console.error(
            "할 일 수정 에러 상세:",
            error.message,
            error.details,
            error.code,
          );
          setErrorMessage("할 일 수정 중 오류가 발생했습니다.");
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
          console.error(
            "할 일 생성 에러 상세:",
            error.message,
            error.details,
            error.code,
          );
          setErrorMessage("할 일 생성 중 오류가 발생했습니다.");
          return;
        }
        setStatusMessage("새 할 일이 추가되었습니다.");
      }
      await fetchTodos(userId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("할 일 저장 네트워크 에러:", errMsg);
      setErrorMessage("네트워크 오류로 할 일을 저장할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {(errorMessage || statusMessage) && (
          <div className="mb-4 rounded-md border border-border bg-popover p-3 text-sm">
            {errorMessage && (
              <p className="text-destructive">⚠ {errorMessage}</p>
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
                로그인된 사용자를 찾을 수 없습니다. 로그인 후 다시 시도하세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Toolbar */}
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

            {/* Main Area */}
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
                    emptyMessage="조건에 맞는 할 일이 없습니다. 검색어나 필터를 바꿔 보세요."
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
