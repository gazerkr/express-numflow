const request = require('supertest')
const express = require('express')
const path = require('path')
const { createFeatureRouter } = require('express-numflow')
const db = require('./db')

describe('Todo App Integration Tests', () => {
  let app

  beforeAll(async () => {
    // Create Express app
    app = express()
    app.use(express.json())

    // Create Feature Router
    const featureRouter = await createFeatureRouter(
      path.join(__dirname, 'features')
    )
    app.use(featureRouter)

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      })
    })

    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      })
    })
  })

  beforeEach(() => {
    // Reset DB before each test
    db.reset()
  })

  describe('POST /todos - Create Todo', () => {
    it('should create a todo successfully', async () => {
      const response = await request(app)
        .post('/todos')
        .send({ title: 'Buy groceries' })
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        data: {
          id: 1,
          title: 'Buy groceries',
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      })
    })

    it('should return 400 error when title is missing', async () => {
      const response = await request(app)
        .post('/todos')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Title is required',
      })
    })

    it('should return 400 error when title is empty string', async () => {
      const response = await request(app)
        .post('/todos')
        .send({ title: '   ' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Title is required',
      })
    })

    it('should trim whitespace from title', async () => {
      const response = await request(app)
        .post('/todos')
        .send({ title: '  Buy groceries  ' })
        .expect(201)

      expect(response.body.data.title).toBe('Buy groceries')
    })
  })

  describe('GET /todos - Get All Todos', () => {
    it('should return empty array when no todos exist', async () => {
      const response = await request(app)
        .get('/todos')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      })
    })

    it('should return all todos', async () => {
      // Create 3 todos
      await request(app).post('/todos').send({ title: 'Todo 1' })
      await request(app).post('/todos').send({ title: 'Todo 2' })
      await request(app).post('/todos').send({ title: 'Todo 3' })

      const response = await request(app)
        .get('/todos')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.count).toBe(3)
      expect(response.body.data).toHaveLength(3)
      expect(response.body.data[0].title).toBe('Todo 1')
      expect(response.body.data[1].title).toBe('Todo 2')
      expect(response.body.data[2].title).toBe('Todo 3')
    })
  })

  describe('GET /todos/:id - Get Specific Todo', () => {
    it('should get a todo successfully', async () => {
      // Create todo
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'Test Todo' })

      const todoId = createResponse.body.data.id

      // Get todo
      const response = await request(app)
        .get(`/todos/${todoId}`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          id: todoId,
          title: 'Test Todo',
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      })
    })

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .get('/todos/999')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Todo not found',
      })
    })
  })

  describe('PUT /todos/:id - Update Todo', () => {
    it('should update a todo successfully', async () => {
      // Create todo
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'Original Title' })

      const todoId = createResponse.body.data.id

      // Update todo
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .send({ title: 'Updated Title' })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          id: todoId,
          title: 'Updated Title',
          completed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      })

      // Verify updatedAt exists and is a valid ISO string
      expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(createResponse.body.data.updatedAt).getTime()
      )
    })

    it('should be able to update completed status', async () => {
      // Create todo
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'Test Todo' })

      const todoId = createResponse.body.data.id

      // Update completed to true
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .send({ completed: true })
        .expect(200)

      expect(response.body.data.completed).toBe(true)
    })

    it('should return 400 error when title is missing', async () => {
      // Create todo
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'Test Todo' })

      const todoId = createResponse.body.data.id

      // Try to update without title
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Title is required',
      })
    })

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .put('/todos/999')
        .send({ title: 'Updated Title' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Todo not found',
      })
    })
  })

  describe('DELETE /todos/:id - Delete Todo', () => {
    it('should delete a todo successfully', async () => {
      // Create todo
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'To be deleted' })

      const todoId = createResponse.body.data.id

      // Delete todo
      const response = await request(app)
        .delete(`/todos/${todoId}`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Todo deleted successfully',
      })

      // Verify deletion
      await request(app)
        .get(`/todos/${todoId}`)
        .expect(404)
    })

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .delete('/todos/999')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Todo not found',
      })
    })

    it('should remove todo from list after deletion', async () => {
      // Create 3 todos
      await request(app).post('/todos').send({ title: 'Todo 1' })
      const todo2 = await request(app).post('/todos').send({ title: 'Todo 2' })
      await request(app).post('/todos').send({ title: 'Todo 3' })

      // Delete Todo 2
      await request(app).delete(`/todos/${todo2.body.data.id}`).expect(200)

      // Get all todos
      const response = await request(app).get('/todos').expect(200)

      expect(response.body.count).toBe(2)
      expect(response.body.data.map((t) => t.title)).toEqual([
        'Todo 1',
        'Todo 3',
      ])
    })
  })

  describe('PATCH /todos/:id/complete - Mark Todo as Completed', () => {
    it('should mark todo as completed successfully', async () => {
      // Create todo
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'To be completed' })

      const todoId = createResponse.body.data.id

      // Mark as completed
      const response = await request(app)
        .patch(`/todos/${todoId}/complete`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          id: todoId,
          title: 'To be completed',
          completed: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      })

      expect(response.body.data.completed).toBe(true)
    })

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .patch('/todos/999/complete')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Todo not found',
      })
    })

    it('should allow marking already completed todo as completed again', async () => {
      // Create todo
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'Test Todo' })

      const todoId = createResponse.body.data.id

      // First completion
      await request(app).patch(`/todos/${todoId}/complete`).expect(200)

      // Second completion
      const response = await request(app)
        .patch(`/todos/${todoId}/complete`)
        .expect(200)

      expect(response.body.data.completed).toBe(true)
    })
  })

  describe('Edge Cases and Integration Scenarios', () => {
    it('should handle full CRUD flow correctly', async () => {
      // 1. Create
      const createResponse = await request(app)
        .post('/todos')
        .send({ title: 'Integration Test Todo' })
        .expect(201)

      const todoId = createResponse.body.data.id

      // 2. Read
      const getResponse = await request(app)
        .get(`/todos/${todoId}`)
        .expect(200)

      expect(getResponse.body.data.title).toBe('Integration Test Todo')

      // 3. Update
      await request(app)
        .put(`/todos/${todoId}`)
        .send({ title: 'Updated Todo' })
        .expect(200)

      // 4. Complete
      await request(app)
        .patch(`/todos/${todoId}/complete`)
        .expect(200)

      // 5. Verify
      const checkResponse = await request(app)
        .get(`/todos/${todoId}`)
        .expect(200)

      expect(checkResponse.body.data.title).toBe('Updated Todo')
      expect(checkResponse.body.data.completed).toBe(true)

      // 6. Delete
      await request(app)
        .delete(`/todos/${todoId}`)
        .expect(200)

      // 7. Verify deletion
      await request(app)
        .get(`/todos/${todoId}`)
        .expect(404)
    })

    it('should handle multiple todos creation and management', async () => {
      // Create multiple todos
      const todos = []
      for (let i = 1; i <= 5; i++) {
        const response = await request(app)
          .post('/todos')
          .send({ title: `Todo ${i}` })
          .expect(201)
        todos.push(response.body.data)
      }

      // Get all todos
      const listResponse = await request(app).get('/todos').expect(200)
      expect(listResponse.body.count).toBe(5)

      // Complete some todos
      await request(app).patch(`/todos/${todos[0].id}/complete`).expect(200)
      await request(app).patch(`/todos/${todos[2].id}/complete`).expect(200)

      // Delete some todos
      await request(app).delete(`/todos/${todos[1].id}`).expect(200)

      // Verify final state
      const finalResponse = await request(app).get('/todos').expect(200)
      expect(finalResponse.body.count).toBe(4)

      const completedCount = finalResponse.body.data.filter(
        (t) => t.completed
      ).length
      expect(completedCount).toBe(2)
    })
  })

  describe('404 and Invalid Routes', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/invalid-path')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Route not found',
      })
    })

    it('should return 404 for invalid HTTP methods', async () => {
      const response = await request(app)
        .patch('/todos')
        .expect(404)

      expect(response.body.error).toBe('Route not found')
    })
  })
})
