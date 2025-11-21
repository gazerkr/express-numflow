# express-numflow Basic CJS Example

> [English Documentation](./README.md)

이 예제는 **CommonJS (CJS)** 방식으로 express-numflow를 사용하는 방법을 보여줍니다.

## 특징

- ✅ CommonJS (`require`/`module.exports`)
- ✅ `module-alias`를 사용한 Short Path 설정
- ✅ Node.js로 직접 실행
- ✅ Feature-First 아키텍처
- ✅ Sequential Steps 패턴

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 서버 실행
npm start

# 또는 개발 모드 (nodemon)
npm run dev
```

## Short Path 설정 (module-alias)

`package.json`에 설정:

```json
{
  "_moduleAliases": {
    "@": ".",
    "@db": "./db.js",
    "@lib": "./lib"
  }
}
```

사용 예시:

```javascript
// ❌ Before (Long relative paths)
const db = require('../../../db')
const { validatePost } = require('../../../lib/validators')

// ✅ After (Short paths)
const db = require('@db')
const { validatePost } = require('@lib/validators')
```

**중요**: `app.js`의 맨 첫 줄에 `require('module-alias/register')` 필수!

## 폴더 구조

```
basic-cjs/
├── package.json          # module-alias 설정 포함
├── app.js                # Express 서버
├── db.js                 # 간단한 인메모리 DB (@db)
├── lib/
│   └── validators.js     # 유틸리티 (@lib/validators)
└── features/
    ├── health/
    │   └── @get/         # GET /health
    │       └── steps/
    │           └── 100-check.js
    └── posts/
        ├── @get/         # GET /posts
        │   ├── steps/
        │   │   ├── 100-fetch-posts.js
        │   │   └── 200-respond.js
        │   └── async-tasks/
        │       └── log-analytics.js
        ├── @post/        # POST /posts
        │   ├── steps/
        │   │   ├── 100-validate.js
        │   │   ├── 200-create-post.js
        │   │   └── 300-respond.js
        │   └── async-tasks/
        │       ├── send-notification.js
        │       ├── update-analytics.js
        │       └── index-for-search.js
        └── [id]/
            └── @get/     # GET /posts/:id
                ├── steps/
                │   ├── 100-fetch-post.js
                │   └── 200-respond.js
                └── async-tasks/
                    ├── increment-view-count.js
                    └── log-access.js
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

## 핵심 개념

### 1. Convention over Configuration

폴더 구조가 곧 API:
- `@get` → GET 메서드
- `@post` → POST 메서드
- `[id]` → `:id` 동적 라우트

### 2. Sequential Steps

Steps는 번호 순서대로 자동 실행:
```
100-validate.js   → Step 1
200-create.js     → Step 2
300-respond.js    → Step 3
```

### 3. Context 공유

모든 Steps는 `ctx` 객체를 통해 데이터 공유:

```javascript
// Step 1: 데이터 저장
ctx.postData = req.body

// Step 2: 데이터 사용
const post = db.createPost(ctx.postData)
```

### 4. Early Return

응답을 보내면 다음 Step 실행 중단:

```javascript
if (!validation.valid) {
  // 에러 응답 후 Step 2, 3 실행 안 됨
  return res.status(400).json({ errors: validation.errors })
}
```

### 5. Async Tasks (백그라운드 작업)

**응답을 보낸 후** 백그라운드에서 실행되는 작업들:

```javascript
// features/posts/@post/async-tasks/send-notification.js
module.exports = async (ctx) => {
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
| GET /posts | `log-analytics.js` | 조회 분석 로깅 |
| POST /posts | `send-notification.js` | 구독자 알림 |
| | `update-analytics.js` | 분석 대시보드 업데이트 |
| | `index-for-search.js` | 검색 엔진 인덱싱 |
| GET /posts/:id | `increment-view-count.js` | 조회수 증가 |
| | `log-access.js` | 접근 로그 기록 |

**장점:**
- ✅ 응답 속도 향상 (사용자는 기다리지 않음)
- ✅ 이메일, 푸시 알림 등 느린 작업 처리
- ✅ 분석, 로깅 등 부가 작업 분리
- ✅ 메인 로직과 부가 로직 명확히 분리

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

- [ESM 예제](../basic-esm/) - ES Modules (`import`/`export`)
- [TypeScript 예제](../basic-ts/) - TypeScript with types
