import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // ESM 네이티브 지원
    globals: true,
    environment: 'node',

    // 테스트 파일 패턴 (Vitest 전용)
    include: ['test/**/*.vitest.test.ts'],

    // Coverage 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['dist/cjs/**/*.js'],
      exclude: [
        'dist/cjs/**/*.d.ts',
      ],
    },

    // TypeScript 지원
    typecheck: {
      enabled: false, // 타입 체크는 별도로 수행
    },
  },

  resolve: {
    alias: {
      // 빌드된 코드를 사용 (new Function() 트릭이 작동)
      'express-numflow': path.resolve(__dirname, './dist/cjs/index.js'),
    },
  },
})
