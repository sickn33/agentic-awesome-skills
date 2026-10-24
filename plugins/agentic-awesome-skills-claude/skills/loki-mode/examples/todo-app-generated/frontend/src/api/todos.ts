const API_BASE = '/api';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CreateTodoRequest {
  title: string;
}

export const fetchTodos = async (): Promise<Todo[]> => {
  const response = await fetch(`${API_BASE}/todos`);
  if (!response.ok) {
    throw new Error('Failed to fetch todos');
  }
  const payload = await response.json();
  if (payload.success !== true || payload.data === undefined) {
    throw new Error("Invalid API response");
  }
  return payload.data;
};

export const createTodo = async (title: string): Promise<Todo> => {
  const response = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error('Failed to create todo');
  }
  const payload = await response.json();
  if (payload.success !== true || payload.data === undefined) {
    throw new Error("Invalid API response");
  }
  return payload.data;
};

export const updateTodo = async (id: number, completed: boolean): Promise<Todo> => {
  const response = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ completed }),
  });
  if (!response.ok) {
    throw new Error('Failed to update todo');
  }
  const payload = await response.json();
  if (payload.success !== true || payload.data === undefined) {
    throw new Error("Invalid API response");
  }
  return payload.data;
};

export const deleteTodo = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete todo');
  }
};
