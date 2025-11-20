/**
 * Shared storage module (ESM)
 * Demonstrates ESM module imports work correctly
 */

export const todos = []
export let nextId = 1

export function addTodo(todo) {
  const newTodo = {
    ...todo,
    id: nextId++,
    createdAt: new Date().toISOString(),
  }
  todos.push(newTodo)
  return newTodo
}

export function getTodos() {
  return [...todos]
}

export function clearTodos() {
  todos.length = 0
  nextId = 1
}
