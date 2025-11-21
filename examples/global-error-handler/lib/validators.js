/**
 * Validation utilities
 */

export function validateUserData(userData) {
  const errors = []

  if (!userData.name || userData.name.trim() === '') {
    errors.push('Name is required')
  }

  if (!userData.email || userData.email.trim() === '') {
    errors.push('Email is required')
  } else if (!isValidEmail(userData.email)) {
    errors.push('Email format is invalid')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validatePostData(postData) {
  const errors = []

  if (!postData.title || postData.title.trim() === '') {
    errors.push('Title is required')
  }

  if (!postData.content || postData.content.trim() === '') {
    errors.push('Content is required')
  }

  if (!postData.authorId || postData.authorId.trim() === '') {
    errors.push('Author ID is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
