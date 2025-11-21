# express-numflow Basic TypeScript Example

> [English Documentation](./README.md)

이 예제는 **TypeScript** 방식으로 express-numflow를 사용하는 방법을 보여줍니다.

## 특징

- ✅ TypeScript with full type safety
- ✅ `tsconfig.json` paths를 사용한 Short Path 설정
- ✅ tsx로 직접 실행 (빠르고 간편)
- ✅ Feature-First 아키텍처
- ✅ Sequential Steps 패턴
- ✅ Type-safe Context 공유

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 (tsx watch - 자동 재시작)
npm run dev

# 또는 직접 실행
npm start

# 빌드 (선택사항)
npm run build
npm run serve
```

## Short Path 설정 (tsconfig.json paths)

`tsconfig.json`에 설정:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@db": ["./db.ts"],
      "@lib/*": ["./lib/*"]
    }
  }
}
```

사용 예시:

```typescript
// ❌ Before (Long relative paths)
import { getAllPosts } from '../../../db'
import { validatePost } from '../../../lib/validators'

// ✅ After (Short paths)
import { getAllPosts } from '@db'
import { validatePost } from '@lib/validators'
```

**주의사항**:
- tsx 사용 시 별도 설정 불필요 (자동으로 paths 해석)
- 빌드 후 실행 시 [tsconfig-paths](https://www.npmjs.com/package/tsconfig-paths) 필요할 수 있음

## 폴더 구조

```
basic-ts/
├── package.json
├── tsconfig.json         # baseUrl + paths 설정
├── app.ts                # Express 서버
├── db.ts                 # 간단한 인메모리 DB (@db)
├── lib/
│   └── validators.ts     # 유틸리티 (@lib/validators)
└── features/
    ├── health/
    │   └── @get/         # GET /health
    │       └── steps/
    │           └── 100-check.ts
    └── posts/
        ├── @get/         # GET /posts
        │   ├── steps/
        │   │   ├── 100-fetch-posts.ts
        │   │   └── 200-respond.ts
        │   └── async-tasks/
        │       └── log-analytics.ts
        ├── @post/        # POST /posts
        │   ├── steps/
        │   │   ├── 100-validate.ts
        │   │   ├── 200-create-post.ts
        │   │   └── 300-respond.ts
        │   └── async-tasks/
        │       ├── send-notification.ts
        │       ├── update-analytics.ts
        │       └── index-for-search.ts
        └── [id]/
            └── @get/     # GET /posts/:id
                ├── steps/
                │   ├── 100-fetch-post.ts
                │   └── 200-respond.ts
                └── async-tasks/
                    ├── increment-view-count.ts
                    └── log-access.ts
```

## API 엔드포인트

### GET /health
헬스체크

```bash
curl http://localhost:3000/health
```

### GET /posts
모든 포스트 조회

```bash
curl http://localhost:3000/posts
```

### POST /posts
새 포스트 생성

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is my first post content!",
    "author": "John Doe"
  }'
```

### GET /posts/:id
특정 포스트 조회

```bash
curl http://localhost:3000/posts/1
```

## TypeScript 특장점

### 1. Type-Safe Context

각 Step마다 Context 타입을 정의할 수 있습니다:

```typescript
interface Context {
  postData: CreatePostData
  post?: Post
  validated?: boolean
}

export default async (ctx: Context, req: Request, res: Response) => {
  // ctx.postData는 type-safe!
  ctx.post = createPost(ctx.postData)
}
```

### 2. Type-Safe Database

데이터베이스 함수도 모두 타입 안전:

```typescript
export interface Post {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

export function createPost(data: CreatePostData): Post {
  // Return type이 보장됨
}
```

### 3. Type-Safe Validation

검증 결과도 타입으로 정의:

```typescript
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePost(data: any): ValidationResult {
  // ...
}
```

### 4. IDE 자동완성 지원

TypeScript를 사용하면 IDE에서 완벽한 자동완성과 타입 체크를 제공합니다.

## CJS vs ESM vs TypeScript 비교

### Import/Export 문법

**CJS:**
```javascript
const db = require('@db')
module.exports = async (ctx, req, res) => { ... }
```

**ESM:**
```javascript
import { getAllPosts } from '#db'
export default async (ctx, req, res) => { ... }
```

**TypeScript:**
```typescript
import { getAllPosts, Post } from '@db'
export default async (ctx: Context, req: Request, res: Response) => { ... }
```

### Short Path 설정

**CJS (module-alias):**
```json
{
  "_moduleAliases": {
    "@db": "./db.js"
  }
}
```

**ESM (package.json imports):**
```json
{
  "type": "module",
  "imports": {
    "#db": "./db.js"
  }
}
```

**TypeScript (tsconfig.json paths):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@db": ["./db.ts"]
    }
  }
}
```

### 실행 방식

**CJS:**
- `require('module-alias/register')` 필요
- `node app.js`

**ESM:**
- `"type": "module"` 필요
- `node app.js`

**TypeScript:**
- `tsx app.ts` (개발)
- `tsc && node dist/app.js` (프로덕션)

## 핵심 개념

### 1. Convention over Configuration

폴더 구조가 곧 API:
- `@get` → GET 메서드
- `@post` → POST 메서드
- `[id]` → `:id` 동적 라우트

### 2. Sequential Steps

Steps는 번호 순서대로 자동 실행:
```
100-validate.ts   → Step 1
200-create.ts     → Step 2
300-respond.ts    → Step 3
```

### 3. Type-Safe Context 공유

모든 Steps는 타입 안전한 `ctx` 객체를 통해 데이터 공유:

```typescript
// Step 1: 데이터 저장 (타입 체크됨)
ctx.postData = req.body

// Step 2: 데이터 사용 (자동완성 지원)
const post = createPost(ctx.postData)
```

### 4. Early Return

응답을 보내면 다음 Step 실행 중단:

```typescript
if (!validation.valid) {
  // 에러 응답 후 Step 2, 3 실행 안 됨
  return res.status(400).json({ errors: validation.errors })
}
```

### 5. Async Tasks (백그라운드 작업)

**응답을 보낸 후** 백그라운드에서 실행되는 작업들:

```typescript
// features/posts/@post/async-tasks/send-notification.ts
import { Post } from '@db'

interface Context {
  post: Post
}

export default async (ctx: Context) => {
  // 응답은 이미 전송됨 - 사용자는 기다리지 않음
  await sendEmail({
    to: 'subscribers@example.com',
    subject: `New Post: ${ctx.post.title}`,
  })
  console.log('[ASYNC-TASK] 📧 Notification sent')
}
```

**실행 흐름:**
```
1. Step 100: 검증
2. Step 200: 포스트 생성
3. Step 300: 응답 전송 ← 사용자는 여기서 응답 받음
4. Async Task 1: 알림 발송 (백그라운드)
5. Async Task 2: 분석 업데이트 (백그라운드)
6. Async Task 3: 검색 인덱싱 (백그라운드)
```

**예제에 포함된 Async Tasks:**

| 엔드포인트 | Async Tasks | 용도 |
|-----------|-------------|------|
| GET /posts | `log-analytics.ts` | 조회 분석 로깅 |
| POST /posts | `send-notification.ts` | 구독자 알림 |
| | `update-analytics.ts` | 분석 대시보드 업데이트 |
| | `index-for-search.ts` | 검색 엔진 인덱싱 |
| GET /posts/:id | `increment-view-count.ts` | 조회수 증가 |
| | `log-access.ts` | 접근 로그 기록 |

**TypeScript의 장점:**
- ✅ Async Task의 Context도 타입 안전!
- ✅ IDE에서 `ctx.post.title` 자동완성
- ✅ 컴파일 타임에 오류 발견

**테스트:**
```bash
# 서버 실행 후
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content","author":"John"}'

# 콘솔에서 async-tasks 로그 확인:
# [ASYNC-TASK] 📧 Notification sent to subscribers
# [ASYNC-TASK] 📊 Analytics updated: New post created
# [ASYNC-TASK] 🔍 Search index updated
```

## 다른 예제

- [CJS 예제](../basic-cjs/) - CommonJS (`require`/`module.exports`)
- [ESM 예제](../basic-esm/) - ES Modules (`import`/`export`)
