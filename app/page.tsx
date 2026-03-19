// AI Todo Manager 메인 화면의 레이아웃과 목업 상호작용을 제공하는 페이지 컴포넌트입니다.

"use client";

import { useMemo, useState } from "react";

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
type TodoSortKey = "createdDate" | "dueDate" | "priority";

const HomePage = () => {

  const [todos, setTodos] = useState<Todo[]>([
    {
      id: "todo_1",
      userId: "user_1",
      title: "팀 회의 준비",
      description: "내일 오전 10시 회의 자료 정리 및 공유",
      createdDate: "2026-03-11 09:00",
      dueDate: "2026-03-12 10:00",
      priority: "high",
      category: ["업무", "회의"],
      completed: false,
    },
    {
      id: "todo_2",
      userId: "user_1",
      title: "운동 30분",
      description: "가벼운 러닝 또는 홈트",
      createdDate: "2026-03-11 08:30",
      dueDate: "",
      priority: "medium",
      category: ["개인"],
      completed: true,
    },
    {
      id: "todo_3",
      userId: "user_1",
      title: "TypeScript 복습",
      description: "유틸 타입/제네릭 정리하기",
      createdDate: "2026-03-10 21:00",
      dueDate: "2026-03-13 20:00",
      priority: "low",
      category: ["학습"],
      completed: false,
    },
  ]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TodoStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<TodoPriorityFilter>("all");
  const [sortKey, setSortKey] = useState<TodoSortKey>("createdDate");

  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);

  const editingTodo = useMemo(() => {
    if (!editingTodoId) return undefined;
    return todos.find((t) => t.id === editingTodoId);
  }, [editingTodoId, todos]);

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
      if (sortKey === "createdDate") return b.createdDate.localeCompare(a.createdDate);
      if (sortKey === "dueDate") return (b.dueDate ?? "").localeCompare(a.dueDate ?? "");
      const weight = (p: TodoPriority) => (p === "high" ? 3 : p === "medium" ? 2 : 1);
      return weight(b.priority) - weight(a.priority);
    };

    return todos
      .filter(matchesQuery)
      .filter(matchesStatus)
      .filter(matchesPriority)
      .slice()
      .sort(sortTodos);
  }, [priorityFilter, query, sortKey, statusFilter, todos]);


  const handleToggleComplete = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleEdit = (id: string) => {
    setEditingTodoId(id);
  };

  const handleDelete = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setEditingTodoId((prev) => (prev === id ? null : prev));
  };

  const handleSubmitTodo = (values: TodoFormValues) => {
    const category = values.category
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (editingTodoId) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === editingTodoId
            ? {
                ...t,
                title: values.title,
                description: values.description,
                dueDate: values.dueDate,
                priority: values.priority,
                category,
                completed: values.completed,
              }
            : t
        )
      );
      setEditingTodoId(null);
      return;
    }

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const MM = String(now.getMinutes()).padStart(2, "0");
    const createdDate = `${yyyy}-${mm}-${dd} ${HH}:${MM}`;

    const newTodo: Todo = {
      id: `todo_${Math.random().toString(16).slice(2)}`,
      userId: "user_1",
      title: values.title,
      description: values.description,
      createdDate,
      dueDate: values.dueDate,
      priority: values.priority,
      category,
      completed: values.completed,
    };

    setTodos((prev) => [newTodo, ...prev]);
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
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
                  onValueChange={(v) => setStatusFilter(v as TodoStatusFilter)}
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
                  onValueChange={(v) => setPriorityFilter(v as TodoPriorityFilter)}
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
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as TodoSortKey)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdDate">생성일순</SelectItem>
                    <SelectItem value="dueDate">마감일순</SelectItem>
                    <SelectItem value="priority">우선순위순</SelectItem>
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
            <h2 className="mb-3 text-sm font-semibold text-foreground">할 일 목록</h2>
            <TodoList
              todos={filteredTodos}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEdit}
              onDelete={handleDelete}
              emptyMessage="조건에 맞는 할 일이 없습니다. 검색어나 필터를 바꿔 보세요."
            />
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
