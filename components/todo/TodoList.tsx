// Todo 목록을 리스트 형태로 표시하는 컴포넌트입니다.

import { Todo, TodoCard } from "./TodoCard";

type TodoListProps = {
  todos: Todo[];
  onToggleComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
};

/**
 * 여러 개의 Todo 카드를 목록 형태로 렌더링합니다.
 */
export const TodoList = ({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
  emptyMessage = "아직 등록된 할 일이 없습니다. 새로운 할 일을 추가해 보세요.",
}: TodoListProps) => {
  if (!todos.length) {
    return (
      <section className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {todos.map((todo) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
};

