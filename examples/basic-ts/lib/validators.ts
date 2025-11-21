/**
 * Validation utilities
 *
 * Demonstrates short path usage: import from '@lib/validators'
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate post creation data
 */
export function validatePost(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required and must be a string')
  } else if (data.title.length < 3) {
    errors.push('Title must be at least 3 characters')
  } else if (data.title.length > 100) {
    errors.push('Title must be less than 100 characters')
  }

  if (!data.content || typeof data.content !== 'string') {
    errors.push('Content is required and must be a string')
  } else if (data.content.length < 10) {
    errors.push('Content must be at least 10 characters')
  }

  if (!data.author || typeof data.author !== 'string') {
    errors.push('Author is required and must be a string')
  } else if (data.author.length < 2) {
    errors.push('Author must be at least 2 characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
