/**
 * Simple in-memory database for demo purposes
 *
 * In production, replace with real database (PostgreSQL, MySQL, MongoDB, etc.)
 */

// In-memory storage
const posts = [
  {
    id: '1',
    title: 'Getting Started with express-numflow',
    content: 'express-numflow brings Convention over Configuration to Express apps...',
    author: 'John Doe',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    title: 'Feature-First Architecture Explained',
    content: 'Feature-First architecture organizes code by features instead of layers...',
    author: 'Jane Smith',
    createdAt: new Date('2024-01-02'),
  },
]

let nextId = 3

/**
 * Get all posts
 */
export function getAllPosts() {
  return posts
}

/**
 * Get post by ID
 */
export function getPostById(id) {
  return posts.find(post => post.id === id)
}

/**
 * Create new post
 */
export function createPost(data) {
  const post = {
    id: String(nextId++),
    title: data.title,
    content: data.content,
    author: data.author,
    createdAt: new Date(),
  }

  posts.push(post)
  return post
}
