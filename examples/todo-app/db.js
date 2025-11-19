/**
 * In-memory Database for Todo App
 */

let todos = []
let nextId = 1

const db = {
  // Find all todos
  findAll() {
    return todos
  },

  // Find todo by ID
  findById(id) {
    return todos.find((todo) => todo.id === parseInt(id))
  },

  // Create a new todo
  create(data) {
    const todo = {
      id: nextId++,
      title: data.title,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    todos.push(todo)
    return todo
  },

  // Update a todo
  update(id, data) {
    const todo = this.findById(id)
    if (!todo) return null

    if (data.title !== undefined) todo.title = data.title
    if (data.completed !== undefined) todo.completed = data.completed
    todo.updatedAt = new Date().toISOString()

    return todo
  },

  // Delete a todo
  delete(id) {
    const index = todos.findIndex((todo) => todo.id === parseInt(id))
    if (index === -1) return false

    todos.splice(index, 1)
    return true
  },

  // Mark todo as completed
  markAsCompleted(id) {
    const todo = this.findById(id)
    if (!todo) return null

    todo.completed = true
    todo.updatedAt = new Date().toISOString()
    return todo
  },

  // Reset database (for testing)
  reset() {
    todos = []
    nextId = 1
  },
}

module.exports = db
