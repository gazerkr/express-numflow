/**
 * Simple in-memory database
 */

const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user' },
]

const posts = [
  { id: '1', title: 'First Post', content: 'Hello World', authorId: '1' },
]

let nextUserId = 3
let nextPostId = 2

export function getAllUsers() {
  return users
}

export function getUserById(id) {
  return users.find(user => user.id === id)
}

export function getUserByEmail(email) {
  return users.find(user => user.email === email)
}

export function createUser(data) {
  const user = {
    id: String(nextUserId++),
    name: data.name,
    email: data.email,
    role: data.role || 'user',
  }
  users.push(user)
  return user
}

export function getAllPosts() {
  return posts
}

export function createPost(data) {
  const post = {
    id: String(nextPostId++),
    title: data.title,
    content: data.content,
    authorId: data.authorId,
  }
  posts.push(post)
  return post
}
