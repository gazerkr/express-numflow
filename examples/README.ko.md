# express-numflow Examples

> [English Documentation](./README.md)

이 디렉토리에는 다양한 방식으로 express-numflow를 사용하는 예제들이 있습니다.

## 기본 예제 (Basic Examples)

세 가지 방식으로 동일한 기능을 구현한 예제입니다:

### 1. [CJS (CommonJS)](./basic-cjs/)
- ✅ `require`/`module.exports` 사용
- ✅ `module-alias`로 short path 설정
- ✅ Node.js로 직접 실행

```bash
cd basic-cjs
npm install
npm start
```

### 2. [ESM (ES Modules)](./basic-esm/)
- ✅ `import`/`export` 사용
- ✅ `package.json` imports로 short path 설정
- ✅ Node.js로 직접 실행 (transpile 불필요)

```bash
cd basic-esm
npm install
npm start
```

### 3. [TypeScript](./basic-ts/)
- ✅ Full TypeScript 지원
- ✅ `tsconfig.json` paths로 short path 설정
- ✅ `tsx`로 직접 실행
- ✅ Type-safe Context 공유

```bash
cd basic-ts
npm install
npm run dev
```

## 실전 예제 (Production-Ready Examples)

### [Todo App](./todo-app/)
완전한 기능을 갖춘 Todo 애플리케이션:
- ✅ CRUD 작업
- ✅ Feature-First 아키텍처
- ✅ 에러 처리
- ✅ 통합 테스트

```bash
cd todo-app
npm install
npm start
```

## 예제별 구조 비교

| Feature | CJS | ESM | TypeScript |
|---------|-----|-----|------------|
| Import/Export | `require`/`module.exports` | `import`/`export` | `import`/`export` with types |
| Short Path | `module-alias` | package.json imports | tsconfig.json paths |
| Setup | `require('module-alias/register')` | `"type": "module"` | tsconfig.json |
| Run Command | `node app.js` | `node app.js` | `tsx app.ts` |
| Transpile | 불필요 | 불필요 | tsx가 자동 처리 |
| Type Safety | ❌ | ❌ | ✅ |

## 공통 API 엔드포인트

모든 기본 예제는 동일한 API를 제공합니다:

```bash
# Health check
GET /health

# Get all posts
GET /posts

# Create a post
POST /posts
{
  "title": "My Post",
  "content": "Post content...",
  "author": "John Doe"
}

# Get a post by ID
GET /posts/:id
```

## 로컬 개발 테스트

이 예제들을 로컬에서 테스트하려면:

```bash
# 1. 먼저 express-numflow 빌드
cd /path/to/express-numflow
npm run build

# 2. 예제 디렉토리로 이동
cd examples/basic-cjs

# 3. 의존성 설치
npm install

# 4. 서버 실행
npm start
```

## 다음 단계

1. 각 예제의 README를 읽고 상세한 설명 확인
2. 코드를 직접 수정해보며 학습
3. 자신의 프로젝트에 적용

## 더 알아보기

- [API Reference](../docs/api-reference.md)
- [Feature-First Architecture Guide](../docs/feature-first-architecture.md)
- [Path Aliasing Guide](../docs/path-aliasing.md)
