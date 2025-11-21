// DOM Elements
const todoInput = document.getElementById('todoInput')
const addBtn = document.getElementById('addBtn')
const todoList = document.getElementById('todoList')
const emptyState = document.getElementById('emptyState')
const totalCount = document.getElementById('totalCount')
const completedCount = document.getElementById('completedCount')
const activeCount = document.getElementById('activeCount')

// State
let todos = []

// API Base URL
const API_URL = '/todos'

// Initialize
async function init() {
  await loadTodos()
  setupEventListeners()
}

// Setup Event Listeners
function setupEventListeners() {
  addBtn.addEventListener('click', handleAddTodo)
  todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAddTodo()
    }
  })
}

// Load all todos
async function loadTodos() {
  try {
    const response = await fetch(API_URL)
    const result = await response.json()

    if (result.success) {
      todos = result.data
      renderTodos()
      updateStats()
    }
  } catch (error) {
    console.error('Failed to load todos:', error)
    showError('Failed to load todos')
  }
}

// Add new todo
async function handleAddTodo() {
  const title = todoInput.value.trim()

  if (!title) {
    showError('Please enter a todo')
    return
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    })

    const result = await response.json()

    if (result.success) {
      todos.push(result.data)
      todoInput.value = ''
      renderTodos()
      updateStats()
    } else {
      showError(result.error || 'Failed to add todo')
    }
  } catch (error) {
    console.error('Failed to add todo:', error)
    showError('Failed to add todo')
  }
}

// Update todo
async function handleUpdateTodo(id, updates) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    const result = await response.json()

    if (result.success) {
      const index = todos.findIndex(t => t.id === id)
      if (index !== -1) {
        todos[index] = result.data
        renderTodos()
        updateStats()
      }
    } else {
      showError(result.error || 'Failed to update todo')
    }
  } catch (error) {
    console.error('Failed to update todo:', error)
    showError('Failed to update todo')
  }
}

// Toggle todo completion
async function handleToggleTodo(id) {
  try {
    const response = await fetch(`${API_URL}/${id}/complete`, {
      method: 'PATCH',
    })

    const result = await response.json()

    if (result.success) {
      const index = todos.findIndex(t => t.id === id)
      if (index !== -1) {
        todos[index] = result.data
        renderTodos()
        updateStats()
      }
    } else {
      showError(result.error || 'Failed to toggle todo')
    }
  } catch (error) {
    console.error('Failed to toggle todo:', error)
    showError('Failed to toggle todo')
  }
}

// Delete todo
async function handleDeleteTodo(id) {
  if (!confirm('Are you sure you want to delete this todo?')) {
    return
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    })

    const result = await response.json()

    if (result.success) {
      todos = todos.filter(t => t.id !== id)
      renderTodos()
      updateStats()
    } else {
      showError(result.error || 'Failed to delete todo')
    }
  } catch (error) {
    console.error('Failed to delete todo:', error)
    showError('Failed to delete todo')
  }
}

// Render todos
function renderTodos() {
  if (todos.length === 0) {
    todoList.style.display = 'none'
    emptyState.style.display = 'block'
    return
  }

  todoList.style.display = 'block'
  emptyState.style.display = 'none'

  todoList.innerHTML = todos.map(todo => `
    <li class="todo-item ${todo.completed ? 'completed' : ''}">
      <div class="todo-content">
        <input
          type="checkbox"
          class="todo-checkbox"
          ${todo.completed ? 'checked' : ''}
          onchange="handleToggleTodo(${todo.id})"
        >
        <span class="todo-title" ondblclick="handleEditTodo(${todo.id})">${escapeHtml(todo.title)}</span>
      </div>
      <div class="todo-actions">
        <button class="btn-edit" onclick="handleEditTodo(${todo.id})" title="Edit">
          ✏️
        </button>
        <button class="btn-delete" onclick="handleDeleteTodo(${todo.id})" title="Delete">
          🗑️
        </button>
      </div>
    </li>
  `).join('')
}

// Handle edit todo
function handleEditTodo(id) {
  const todo = todos.find(t => t.id === id)
  if (!todo) return

  const newTitle = prompt('Edit todo', todo.title)
  if (newTitle && newTitle.trim() && newTitle.trim() !== todo.title) {
    handleUpdateTodo(id, {
      title: newTitle.trim(),
      completed: todo.completed
    })
  }
}

// Update statistics
function updateStats() {
  const total = todos.length
  const completed = todos.filter(t => t.completed).length
  const active = total - completed

  totalCount.textContent = `Total: ${total}`
  completedCount.textContent = `Completed: ${completed}`
  activeCount.textContent = `Active: ${active}`
}

// Show error message
function showError(message) {
  alert(message)
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
