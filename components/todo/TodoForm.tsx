// Todo를 새로 추가하거나 기존 할 일을 편집하는 폼 컴포넌트입니다.

import { useState, FormEvent } from "react";
import type { Todo, TodoPriority } from "./TodoCard";

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

/**
 * Todo 생성 및 수정을 위한 입력 폼을 제공합니다.
 */
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

  const handleChange =
    (field: keyof TodoFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const nextValue =
        field === "completed" ? (event as React.ChangeEvent<HTMLInputElement>).target.checked : event.target.value;

      setValues((prev) => ({
        ...prev,
        [field]: nextValue,
      }));
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
      // 간단한 클라이언트 검증 메시지
      alert("할 일 제목을 입력해 주세요.");
      return;
    }

    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="todo-title" className="text-xs font-medium text-foreground">
          제목
        </label>
        <input
          id="todo-title"
          type="text"
          value={values.title}
          onChange={handleChange("title")}
          placeholder="예: 내일 팀 회의 준비"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="todo-description" className="text-xs font-medium text-foreground">
          상세 설명
        </label>
        <textarea
          id="todo-description"
          value={values.description}
          onChange={handleChange("description")}
          placeholder="할 일에 대한 메모를 자유롭게 적어 주세요."
          rows={3}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="todo-due-date" className="text-xs font-medium text-foreground">
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
          <label htmlFor="todo-priority" className="text-xs font-medium text-foreground">
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
          <label htmlFor="todo-category" className="text-xs font-medium text-foreground">
            카테고리 (쉼표로 구분)
          </label>
          <input
            id="todo-category"
            type="text"
            value={values.category}
            onChange={handleChange("category")}
            placeholder="예: 업무, 회의"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
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
            className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

