# Lifecycle Hooks 예제

> [English](./README.md) | **한국어**

이 예제는 `express-numflow`의 라이프사이클 훅인 `contextInitializer`와 `onError`를 사용하는 방법을 보여줍니다.

## 라이프사이클 훅이란?

라이프사이클 훅은 feature의 실행 흐름에서 특정 시점에 실행되는 함수들입니다:

- **`contextInitializer`**: 모든 step이 실행되기 **전에** 실행됩니다
- **`onError`**: feature의 어느 부분에서든 에러가 발생하면 실행됩니다

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

### 1. POST /users - 사용자 생성

인증 + 검증 + 중복 체크를 보여주는 전체 라이프사이클 데모

**라이프사이클 흐름:**
```
contextInitializer (인증, 로깅)
  ↓
Step 100 (검증)
  ↓
Step 200 (사용자 생성)
  ↓
Success or onError (에러 발생시)
```

**성공 요청:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

**검증 에러 (400):**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "name": "",
    "email": "invalid-email"
  }'
```

**인증 에러 (401):**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

**중복 에러 (409):**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com"
  }'
```

### 2. GET /users/:id - 사용자 조회

인증 및 404 처리를 보여줍니다.

**성공 요청:**
```bash
curl http://localhost:3000/users/1 \
  -H "Authorization: Bearer user-token"
```

**404 에러:**
```bash
curl http://localhost:3000/users/999 \
  -H "Authorization: Bearer user-token"
```

### 3. POST /posts - 포스트 생성 (관리자 전용)

역할 기반 접근 제어를 보여줍니다.

**성공 요청 (관리자 토큰):**
```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "title": "New Post",
    "content": "This is a new post"
  }'
```

**권한 에러 (403 - 일반 사용자):**
```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "title": "New Post",
    "content": "This is a new post"
  }'
```

## 주요 개념

### contextInitializer

모든 step이 실행되기 전에 실행됩니다. 다음 용도로 사용합니다:

- 사용자 인증
- 요청 로깅
- 컨텍스트 데이터 초기화
- 권한 확인

**예시:**
```javascript
export default feature({
  contextInitializer: (ctx, req, res) => {
    // 1. 사용자 인증
    ctx.user = authenticateUser(req)

    // 2. 요청 로깅
    logRequest(ctx, req)

    // 3. 데이터 준비
    ctx.userData = req.body
  },
  // ...
})
```

### onError

feature의 어느 부분에서든 에러가 발생하면 실행됩니다:

- contextInitializer에서의 에러
- 모든 step에서의 에러
- async-task에서의 에러

**예시:**
```javascript
export default feature({
  // ...
  onError: async (error, ctx, req, res) => {
    // 에러 로깅
    logError(error, ctx, req)

    // 에러 타입별 응답
    if (error.message.includes('Authorization')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    } else if (error.message.includes('validation')) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: error.errors
      })
    }
    // ... 더 많은 에러 타입
  }
})
```

## 파일 구조

```
lifecycle-hooks/
├── package.json          # ESM 설정 및 의존성
├── app.js               # Express 서버 설정
├── db.js                # 인메모리 데이터베이스
├── lib/
│   ├── auth.js          # 인증 유틸리티
│   ├── logger.js        # 로깅 유틸리티
│   └── validators.js    # 검증 유틸리티
└── features/
    ├── users/
    │   ├── @post/       # POST /users
    │   │   ├── index.js           # 라이프사이클 훅
    │   │   └── steps/
    │   │       ├── 100-validate.js
    │   │       └── 200-create-user.js
    │   └── [id]/
    │       └── @get/    # GET /users/:id
    │           ├── index.js       # 라이프사이클 훅
    │           └── steps/
    │               ├── 100-fetch-user.js
    │               └── 200-respond.js
    └── posts/
        └── @post/       # POST /posts
            ├── index.js           # 라이프사이클 훅 (역할 기반)
            └── steps/
                ├── 100-validate.js
                └── 200-create-post.js
```

## 인증 토큰

테스트를 위해 미리 정의된 토큰을 사용하세요:

- **일반 사용자**: `Bearer user-token`
  - 사용자: Bob (id: 2)
  - 역할: user

- **관리자**: `Bearer admin-token`
  - 사용자: Alice (id: 1)
  - 역할: admin

## 학습 포인트

1. **contextInitializer**는 모든 step 전에 한 번 실행됩니다
2. **onError**는 feature의 어느 부분에서든 에러를 처리합니다
3. **에러 전파**: step에서 던진 에러는 자동으로 onError로 전달됩니다
4. **컨텍스트 공유**: ctx 객체는 모든 라이프사이클 단계에서 공유됩니다
5. **세밀한 제어**: feature별로 에러 처리 로직을 커스터마이즈할 수 있습니다

## 다음 단계

- [global-error-handler](../global-error-handler) - app.use()를 사용한 글로벌 에러 처리 방식
- [basic-esm](../basic-esm) - express-numflow 기본 사용법
