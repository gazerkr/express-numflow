module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2020: true,
    jest: true,
  },
  rules: {
    // 0.1.0 버전 - 느슨한 규칙 적용
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    'no-useless-catch': 'off',
    'prefer-const': 'off',
    'no-extra-semi': 'off',
    'no-case-declarations': 'off',
    'no-fallthrough': 'off',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    '*.js',
    'jest.config.js',
    '.eslintrc.js',
  ],
}
