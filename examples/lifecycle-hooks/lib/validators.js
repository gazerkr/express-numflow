/**
 * Validation utilities
 */

export function validateUserData(data) {
  const errors = []

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string')
  } else if (data.name.length < 2) {
    errors.push('Name must be at least 2 characters')
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required and must be a string')
  } else if (!data.email.includes('@')) {
    errors.push('Email must be valid')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validatePostData(data) {
  const errors = []

  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required and must be a string')
  } else if (data.title.length < 3) {
    errors.push('Title must be at least 3 characters')
  }

  if (!data.content || typeof data.content !== 'string') {
    errors.push('Content is required and must be a string')
  } else if (data.content.length < 10) {
    errors.push('Content must be at least 10 characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
