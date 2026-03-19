// 개별 할 일을 카드 형태로 표시하는 컴포넌트입니다.

/**
 * 개별 Todo 데이터를 카드 UI로 렌더링하는 컴포넌트입니다.
 */
export type TodoPriority = "high" | "medium" | "low";

export type Todo = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  createdDate: string;
  dueDate?: string | null;
  priority: TodoPriority;
  category: string[];
  completed: boolean;
};

type TodoCardProps = {
  todo: Todo;
  onToggleComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

/**
 * 단일 Todo 카드와 관련 액션 버튼을 표시합니다.
 */
export const TodoCard = ({ todo, onToggleComplete, onEdit, onDelete }: TodoCardProps) => {
  const handleToggleComplete = () => {
    if (onToggleComplete) {
      onToggleComplete(todo.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(todo.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(todo.id);
    }
  };

  const priorityBadgeColor =
    todo.priority === "high"
      ? "bg-red-100 text-red-700"
      : todo.priority === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <article
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
      aria-label={`할 일: ${todo.title}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleComplete}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background"
            aria-pressed={todo.completed}
            aria-label={todo.completed ? "할 일 미완료로 변경" : "할 일 완료로 표시"}
          >
            {todo.completed && <span className="h-3 w-3 rounded-full bg-primary" />}
          </button>
          <h3 className={`text-sm font-semibold ${todo.completed ? "text-muted-foreground line-through" : ""}`}>
            {todo.title}
          </h3>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeColor}`}>
          {todo.priority === "high" ? "높음" : todo.priority === "medium" ? "보통" : "낮음"}
        </span>
      </header>

      {todo.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">{todo.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {todo.dueDate && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            <span>마감</span>
            <time dateTime={todo.dueDate}>{todo.dueDate}</time>
          </span>
        )}
        {todo.category?.length > 0 &&
          todo.category.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground"
            >
              {cat}
            </span>
          ))}
      </div>

      <footer className="mt-1 flex justify-end gap-1">
        <button
          type="button"
          onClick={handleEdit}
          className="rounded-md px-2 py-1 text-xs text-primary hover:bg-accent"
        >
          편집
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-accent"
        >
          삭제
        </button>
      </footer>
    </article>
  );
};

