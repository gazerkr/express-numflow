# Global Error Handler 예제

> [English](./README.md) | **한국어**

이 예제는 `app.use()`를 사용하여 전역 에러 핸들러를 구현하는 방법을 보여줍니다.

## 전역 에러 핸들러란?

전역 에러 핸들러는 Express의 미들웨어로, 애플리케이션의 모든 라우트와 feature에서 발생하는 에러를 중앙에서 처리합니다.

### Lifecycle Hooks와의 차이점

| 특징 | Global Error Handler | onError (Lifecycle Hook) |
|------|---------------------|--------------------------|
| 범위 | 전체 애플리케이션 | 개별 feature |
| 위치 | app.js에 한 번 정의 | 각 feature/index.js에 정의 |
| 우선순위 | 낮음 (마지막 방어선) | 높음 (feature별 처리) |
| 사용 사례 | 공통 에러 처리 | feature별 커스텀 처리 |

**조합 사용:**
- onError가 정의되어 있으면 feature-level에서 처리
- onError가 없거나 에러가 전파되면 global handler가 처리

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 서버 시작
npm start

# 개발 모드 (자동 재시작)
npm run dev
```

서버는 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### 1. GET /users - 사용자 목록

모든 사용자 목록을 조회합니다.

```bash
curl http://localhost:3000/users
```

**응답:**
```json
{
  "success": true,
  "count": 2,
  "users": [
    { "id": "1", "name": "Alice", "email": "alice@example.com" },
    { "id": "2", "name": "Bob", "email": "bob@example.com" }
  ]
}
```

### 2. POST /users - 사용자 생성

새로운 사용자를 생성합니다. 검증 에러와 중복 에러가 전역 핸들러로 전달됩니다.

**성공 요청:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

**검증 에러 (400) - 전역 핸들러가 처리:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "email": "invalid-email"
  }'
```

**응답:**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "User validation failed",
  "errors": [
    "Name is required",
    "Email format is invalid"
  ]
}
```

**중복 에러 (409) - 전역 핸들러가 처리:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com"
  }'
```

### 3. GET /posts - 포스트 목록

모든 포스트 목록을 조회합니다.

```bash
curl http://localhost:3000/posts
```

### 4. GET /posts/:id - 포스트 조회

특정 포스트를 조회합니다. 404 에러가 전역 핸들러로 전달됩니다.

**성공 요청:**
```bash
curl http://localhost:3000/posts/1
```

**404 에러 - 전역 핸들러가 처리:**
```bash
curl http://localhost:3000/posts/999
```

**응답:**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Post with ID 999 not found"
}
```

## 전역 에러 핸들러 구현

### app.js에서 정의

```javascript
// 모든 라우트 뒤에 정의해야 함
app.use((err, req, res, next) => {
  console.log('🚨 GLOBAL ERROR HANDLER TRIGGERED')

  // 이미 응답이 전송된 경우
  if (res.headersSent) {
    return next(err)
  }

  // 에러 타입별 처리
  if (err.message.includes('validation') || err.errors) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: err.message,
      errors: err.errors || []
    })
  }

  if (err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: err.message
    })
  }

  // 기본 500 에러
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  })
})
```

### Feature에서 에러 던지기

Feature-level의 onError를 정의하지 않으면, 모든 에러가 자동으로 전역 핸들러로 전파됩니다.

```javascript
// features/users/@post/steps/100-validate.js
export default async (ctx, req, res) => {
  const validation = validateUserData(ctx.userData)

  if (!validation.valid) {
    // 에러를 던지면 전역 핸들러가 처리
    const error = new Error('User validation failed')
    error.errors = validation.errors
    throw error
  }
}
```

## 에러 처리 흐름

```
Step에서 에러 발생
  ↓
feature에 onError가 있는가?
  ├─ Yes → onError에서 처리 (끝)
  └─ No → 전역 핸들러로 전파
           ↓
      전역 핸들러에서 처리
```

## 주요 개념

### 1. 중앙 집중식 에러 처리

모든 feature에서 공통으로 사용하는 에러 처리 로직을 한 곳에서 관리합니다.

**장점:**
- 일관된 에러 응답 포맷
- 코드 중복 감소
- 유지보수 용이

### 2. 에러 타입 감지

에러 메시지나 속성을 기반으로 적절한 HTTP 상태 코드를 반환합니다:

- `validation` 또는 `errors` 속성 → 400 Bad Request
- `not found` → 404 Not Found
- `already exists` 또는 `duplicate` → 409 Conflict
- 기타 → 500 Internal Server Error

### 3. 4개의 매개변수 필수

Express는 정확히 4개의 매개변수를 가진 미들웨어를 에러 핸들러로 인식합니다:

```javascript
app.use((err, req, res, next) => {
  // err, req, res, next 모두 필수
})
```

### 4. 위치가 중요

전역 에러 핸들러는 반드시 모든 라우트와 미들웨어 **뒤에** 정의해야 합니다:

```javascript
// 1. 일반 미들웨어
app.use(express.json())

// 2. 라우트
app.use(numflow({ ... }))

// 3. 전역 에러 핸들러 (마지막!)
app.use((err, req, res, next) => { ... })
```

## 파일 구조

```
global-error-handler/
├── package.json          # ESM 설정 및 의존성
├── app.js               # Express 서버 + 전역 에러 핸들러
├── db.js                # 인메모리 데이터베이스
├── lib/
│   └── validators.js    # 검증 유틸리티
└── features/
    ├── users/
    │   ├── @get/        # GET /users
    │   │   └── steps/
    │   │       └── 100-list-users.js
    │   └── @post/       # POST /users
    │       └── steps/
    │           ├── 100-validate.js    # 에러를 던짐
    │           └── 200-create-user.js
    └── posts/
        ├── @get/        # GET /posts
        │   └── steps/
        │       └── 100-list-posts.js
        └── [id]/
            └── @get/    # GET /posts/:id
                └── steps/
                    ├── 100-fetch-post.js  # 404 에러를 던짐
                    └── 200-respond.js
```

## 학습 포인트

1. **전역 핸들러는 마지막 방어선**: feature-level에서 처리되지 않은 모든 에러를 잡아냅니다
2. **중앙 집중식 관리**: 공통 에러 로직을 한 곳에서 관리합니다
3. **일관된 응답**: 모든 에러가 동일한 포맷으로 응답됩니다
4. **간편한 feature 작성**: 각 feature는 onError 없이도 에러 처리가 됩니다
5. **유연성**: 필요한 feature에만 onError를 추가하여 커스터마이즈 가능

## 언제 사용할까?

### Global Error Handler 사용 시점:
- 모든 feature에서 일관된 에러 응답이 필요할 때
- 에러 처리 로직을 중앙에서 관리하고 싶을 때
- 간단한 CRUD API를 빠르게 만들 때

### onError (Lifecycle Hook) 사용 시점:
- Feature별로 다른 에러 처리가 필요할 때
- 특정 feature에서 복잡한 에러 처리가 필요할 때
- 에러 발생 시 특별한 비즈니스 로직이 필요할 때

## 다음 단계

- [lifecycle-hooks](../lifecycle-hooks) - contextInitializer와 onError를 사용한 feature-level 에러 처리
- [basic-esm](../basic-esm) - express-numflow 기본 사용법
