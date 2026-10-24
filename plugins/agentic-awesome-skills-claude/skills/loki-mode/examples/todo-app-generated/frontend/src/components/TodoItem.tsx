import { Todo } from '../api/todos';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => void;
}

export const TodoItem = ({ todo, onToggle, onDelete }: TodoItemProps) => {
  const handleToggle = () => {
    void onToggle(todo.id).catch(() => { /* Hook exposes the error to the page. */ });
  };

  const handleDelete = () => {
    onDelete(todo.id);
  };

  return (
    <div className="todo-item">
      <div className="todo-content">
        <input
          type="checkbox"
          aria-label={`Mark ${todo.title} ${todo.completed ? "incomplete" : "complete"}`}
          checked={todo.completed}
          onChange={handleToggle}
          className="todo-checkbox"
        />
        <span className={todo.completed ? 'todo-title completed' : 'todo-title'}>
          {todo.title}
        </span>
      </div>
      <button onClick={handleDelete} className="delete-button">
        Delete
      </button>
    </div>
  );
};
