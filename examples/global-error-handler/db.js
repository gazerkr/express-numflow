/**
 * Simple in-memory database for demonstration
 */

let users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
]

let posts = [
  { id: '1', title: 'First Post', content: 'Hello World', authorId: '1' },
  { id: '2', title: 'Second Post', content: 'Express Numflow is great!', authorId: '2' },
]

// User operations
export function getAllUsers() {
  return users
}

export function getUserById(id) {
  return users.find(u => u.id === id)
}

export function getUserByEmail(email) {
  return users.find(u => u.email === email)
}

export function createUser(userData) {
  const newUser = {
    id: String(users.length + 1),
    ...userData,
  }
  users.push(newUser)
  return newUser
}

// Post operations
export function getAllPosts() {
  return posts
}

export function getPostById(id) {
  return posts.find(p => p.id === id)
}

export function createPost(postData) {
  const newPost = {
    id: String(posts.length + 1),
    ...postData,
  }
  posts.push(newPost)
  return newPost
}
