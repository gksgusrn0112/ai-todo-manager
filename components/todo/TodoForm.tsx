"use client";

import { useState, FormEvent } from "react";
import type { Todo, TodoPriority } from "./TodoCard";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";

type TodoFormValues = {
  title: string;
  description: string;
  dueDate: string;
  priority: TodoPriority;
  category: string;
  completed: boolean;
};

type TodoFormProps = {
  initialTodo?: Todo;
  onSubmit: (values: TodoFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export const TodoForm = ({
  initialTodo,
  onSubmit,
  onCancel,
  submitLabel = initialTodo ? "할 일 수정" : "할 일 추가",
}: TodoFormProps) => {
  const [values, setValues] = useState<TodoFormValues>({
    title: initialTodo?.title ?? "",
    description: initialTodo?.description ?? "",
    dueDate: initialTodo?.dueDate ?? "",
    priority: initialTodo?.priority ?? "medium",
    category: (initialTodo?.category ?? []).join(", "),
    completed: initialTodo?.completed ?? false,
  });

  // AI 관련 상태
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleChange =
    (field: keyof TodoFormValues) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const nextValue =
        field === "completed"
          ? (event as React.ChangeEvent<HTMLInputElement>).target.checked
          : event.target.value;

      setValues((prev) => ({ ...prev, [field]: nextValue }));
    };

  // AI 자동 입력 처리 함수
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setAiError("자연어로 할 일을 먼저 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);

    try {
      const response = await fetch("/api/parse-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // AI가 시간 기준을 잡도록 현재 시간 전달
        body: JSON.stringify({
          prompt: aiPrompt,
          currentTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("API 요청에 실패했습니다.");
      }

      const { result } = await response.json();

      let combinedDueDate = "";
      if (result.due_date) {
        combinedDueDate = `${result.due_date}T${result.due_time || "09:00"}`;
      }

      // 상태 업데이트 (폼 필드 자동 채우기 - 설명(description) 포함)
      setValues((prev) => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        priority: result.priority || prev.priority,
        category: result.category || prev.category,
        dueDate: combinedDueDate || prev.dueDate,
      }));

      setAiPrompt("");
    } catch (err: unknown) {
      console.error(err);
      setAiError("AI 변환에 실패했습니다. 직접 입력해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
    };

    if (!trimmed.title) {
      alert("할 일 제목을 입력해 주세요.");
      return;
    }

    onSubmit(trimmed);

    // 새 할 일 추가 후 폼 초기화
    if (!initialTodo) {
      setValues({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
        category: "",
        completed: false,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* AI 입력 영역 */}
      {!initialTodo && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <label
            htmlFor="ai-prompt"
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <Wand2 className="h-4 w-4" /> AI 스마트 입력
          </label>
          <div className="flex gap-2">
            <input
              id="ai-prompt"
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="예: 내일 오후 3시 팀 회의 준비 메모: 자료 챙길 것"
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAIGenerate();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAIGenerate}
              disabled={isAnalyzing}
              className="h-9 whitespace-nowrap"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 분석 중...
                </>
              ) : (
                "자동 채우기"
              )}
            </Button>
          </div>
          {aiError && <p className="text-xs text-destructive">{aiError}</p>}
        </div>
      )}

      {/* 기본 입력 폼 */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="todo-title"
            className="text-xs font-medium text-foreground"
          >
            제목
          </label>
          <input
            id="todo-title"
            type="text"
            value={values.title}
            onChange={handleChange("title")}
            placeholder="예: 팀 회의 준비"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="todo-description"
            className="text-xs font-medium text-foreground"
          >
            상세 설명
          </label>
          <textarea
            id="todo-description"
            value={values.description}
            onChange={handleChange("description")}
            rows={2}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="todo-due-date"
              className="text-xs font-medium text-foreground"
            >
              마감일
            </label>
            <input
              id="todo-due-date"
              type="datetime-local"
              value={values.dueDate}
              onChange={handleChange("dueDate")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="todo-priority"
              className="text-xs font-medium text-foreground"
            >
              우선순위
            </label>
            <select
              id="todo-priority"
              value={values.priority}
              onChange={handleChange("priority")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="todo-category"
              className="text-xs font-medium text-foreground"
            >
              카테고리
            </label>
            <input
              id="todo-category"
              type="text"
              value={values.category}
              onChange={handleChange("category")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-2">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={values.completed}
              onChange={handleChange("completed")}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            완료된 할 일로 표시
          </label>

          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="h-9 rounded-md border border-input px-3 text-xs text-muted-foreground hover:bg-muted"
              >
                취소
              </button>
            )}
            <button
              type="submit"
              className="h-9 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
