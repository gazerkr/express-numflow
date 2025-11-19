# Convention over Configuration 가이드

## 목차

- [Convention over Configuration이란?](#convention-over-configuration이란)
- [왜 Convention over Configuration인가?](#왜-convention-over-configuration인가)
- [express-numflow의 규약](#express-numflow의-규약)
- [폴더 구조 규약](#폴더-구조-규약)
- [HTTP 메서드 규약](#http-메서드-규약)
- [파일 명명 규약](#파일-명명-규약)
- [실제 예제](#실제-예제)
- [규약 vs 설정](#규약-vs-설정)
- [베스트 프랙티스](#베스트-프랙티스)

---

## Convention over Configuration이란?

**Convention over Configuration** (CoC, 설정보다 규약)은 규약을 기반으로 합리적인 기본값을 제공함으로써 **개발자가 내려야 하는 결정의 수를 줄이는** 소프트웨어 설계 패러다임입니다.

프레임워크에게 무엇을 해야 하는지 알려주는 설정 파일을 작성하는 대신, 프레임워크가 이미 이해하는 명명 및 구조 패턴을 따릅니다.

### 전통적인 접근 방식 (설정 중심)

```javascript
// config/routes.js
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/users',
      handler: 'controllers/users.list',
      steps: ['validate', 'fetch', 'respond']
    },
    {
      method: 'POST',
      path: '/users',
      handler: 'controllers/users.create',
      steps: ['validate', 'create', 'respond'],
      asyncTasks: ['sendWelcomeEmail']
    }
  ]
}
```

**문제점:**
- 설정 파일이 커짐
- 실수하기 쉬움
- 설정이 구식이 될 수 있음
- 폴더 구조와 설정 간 중복

### Convention over Configuration 접근 방식

```
features/
└── users/
    ├── @get/              ← 규약: @get = GET /users
    │   └── steps/
    │       ├── 100-validate.js
    │       ├── 200-fetch.js
    │       └── 300-respond.js
    └── @post/             ← 규약: @post = POST /users
        ├── steps/
        │   ├── 100-validate.js
        │   ├── 200-create.js
        │   └── 300-respond.js
        └── async-tasks/
            └── sendWelcomeEmail.js
```

**장점:**
- **설정 파일이 필요 없음**
- **폴더 구조 = 설정**
- **자기 문서화**
- **설정/코드 불일치 불가능**

---

## 왜 Convention over Configuration인가?

### 1. **더 적은 보일러플레이트**

**설정**이 아닌 **코드**를 작성합니다.

**설정을 사용할 때:**
```javascript
// routes.config.js (20줄)
// controllers/users.js (핸들러 등록)
// app.js (라우트 로딩)
```

**규약을 사용할 때:**
```
features/users/@post/steps/100-validate.js
(이게 전부입니다!)
```

### 2. **더 빠른 개발**

다음이 필요 없습니다:
- 설정 파일 생성
- 수동 라우트 등록
- 기능 추가 시 설정 업데이트
- 설정 불일치 디버깅

### 3. **더 나은 발견 가능성**

새로운 개발자는 **폴더만 보면** 코드베이스를 탐색할 수 있습니다:

```
features/
├── users/          ← "아, 사용자 관련 기능"
│   ├── @get/       ← "GET 엔드포인트"
│   └── @post/      ← "POST 엔드포인트"
└── orders/
    ├── @get/
    └── @post/
```

문서나 설정 파일을 읽을 필요가 없습니다!

### 4. **일관성**

팀의 모든 사람이 같은 구조를 따릅니다:
- 새 기능? `@method/`가 있는 폴더 생성
- 유효성 검증 추가? `100-validate.js` 생성
- 백그라운드 작업 추가? `async-tasks/task.js` 생성

**모호함 제로. 논의 불필요.**

### 5. **유지보수성**

규약은 **파일 시스템에 의해 강제**됩니다:
- 메서드 오타 불가 (폴더가 매칭 안 됨)
- 라우트 등록 잊어버릴 수 없음 (자동 발견)
- 고아 설정 불가 (폴더 = 설정)

---

## express-numflow의 규약

express-numflow는 다음 규약을 사용합니다:

### 1. **폴더 이름 → 라우트**

```
features/api/users/  →  /api/users
features/posts/      →  /posts
```

### 2. **`@method` 폴더 → HTTP 메서드**

```
@get/     →  GET
@post/    →  POST
@put/     →  PUT
@patch/   →  PATCH
@delete/  →  DELETE
```

### 3. **`[param]` 폴더 → 라우트 파라미터**

```
users/[id]/       →  /users/:id
posts/[postId]/   →  /posts/:postId
```

### 4. **`steps/` 폴더 → 순차 실행**

```
steps/
  100-validate.js   →  먼저 실행
  200-process.js    →  두 번째 실행
  300-respond.js    →  세 번째 실행
```

### 5. **`async-tasks/` 폴더 → 백그라운드 작업**

```
async-tasks/
  send-email.js     →  응답 후 백그라운드에서 실행
  update-cache.js   →  응답 후 백그라운드에서 실행
```

### 6. **숫자 접두사 → 실행 순서**

```
100-xxx.js   →  Step 1
200-xxx.js   →  Step 2
300-xxx.js   →  Step 3
```

---

## 폴더 구조 규약

### 기본 구조

```
features/
└── [feature-name]/
    └── @[method]/
        ├── index.js         (선택사항 - 명시적 설정용)
        ├── steps/           (필수 - 순차 로직)
        │   ├── 100-xxx.js
        │   ├── 200-xxx.js
        │   └── 300-xxx.js
        └── async-tasks/     (선택사항 - 백그라운드 작업)
            ├── task1.js
            └── task2.js
```

### 중첩된 Features

```
features/
└── api/
    └── v1/
        └── users/
            ├── @get/
            └── @post/

→ 라우트:
  GET  /api/v1/users
  POST /api/v1/users
```

### 동적 라우트

```
features/
└── users/
    └── [id]/
        ├── @get/        →  GET /users/:id
        ├── @put/        →  PUT /users/:id
        └── @delete/     →  DELETE /users/:id
```

### 다중 레벨 파라미터

```
features/
└── posts/
    └── [postId]/
        └── comments/
            └── [commentId]/
                └── @get/

→ 라우트: GET /posts/:postId/comments/:commentId
```

---

## HTTP 메서드 규약

### 표준 메서드

| 폴더 이름 | HTTP 메서드 | 일반적인 용도 |
|----------|------------|-------------|
| `@get/` | GET | 리소스 목록 조회 또는 검색 |
| `@post/` | POST | 새 리소스 생성 |
| `@put/` | PUT | 전체 리소스 업데이트 |
| `@patch/` | PATCH | 부분 리소스 업데이트 |
| `@delete/` | DELETE | 리소스 삭제 |

### 규약 예제

**모든 사용자 조회:**
```
users/@get/  →  GET /users
```

**사용자 생성:**
```
users/@post/  →  POST /users
```

**특정 사용자 조회:**
```
users/[id]/@get/  →  GET /users/:id
```

**사용자 수정:**
```
users/[id]/@put/  →  PUT /users/:id
```

**사용자 삭제:**
```
users/[id]/@delete/  →  DELETE /users/:id
```

**커스텀 액션 (완료로 표시):**
```
todos/[id]/complete/@patch/  →  PATCH /todos/:id/complete
```

---

## 파일 명명 규약

### Step 파일

**규약:** `[숫자]-[설명적-이름].js`

**규칙:**
1. 숫자로 시작 (100, 200, 300 등)
2. 공백은 하이픈 사용
3. 설명적인 이름 사용

**예제:**

```javascript
// [좋음]
100-validate-input.js
200-check-permissions.js
300-fetch-from-database.js
400-transform-data.js
500-send-response.js

// [나쁨]
1.js                    // 설명적이지 않음
step1.js                // 숫자 접두사 누락
validateInput.js        // 숫자 누락
validate_input.js       // 하이픈 사용, 언더스코어 아님
```

### Async Task 파일

**규약:** `[설명적-이름].js` (숫자 불필요)

**규칙:**
1. 설명적인 이름 사용
2. 공백은 하이픈 사용
3. 숫자 접두사 없음 (병렬 실행)

**예제:**

```javascript
// [좋음]
send-welcome-email.js
update-user-analytics.js
notify-admin.js
generate-pdf-report.js

// [나쁨]
email.js                // 충분히 설명적이지 않음
sendWelcomeEmail.js     // 하이픈 사용, camelCase 아님
100-send-email.js       // 숫자 사용 금지 (병렬 실행)
```

### Index 파일 (선택사항)

**규약:** `index.js`

명시적 설정이 필요할 때 사용:

```javascript
// features/users/@post/index.js
const { feature } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.timestamp = Date.now()
  },

  onError: async (error, ctx, req, res) => {
    res.status(500).json({ error: error.message })
  }
})
```

**대부분의 기능은 `index.js`가 필요 없습니다 - 선택사항입니다!**

---

## 실제 예제

### 예제 1: RESTful 사용자 API

**폴더 구조:**
```
features/
└── users/
    ├── @get/                   # GET /users - 전체 조회
    │   └── steps/
    │       ├── 100-fetch-users.js
    │       └── 200-send-response.js
    ├── @post/                  # POST /users - 생성
    │   ├── steps/
    │   │   ├── 100-validate.js
    │   │   ├── 200-create-user.js
    │   │   └── 300-send-response.js
    │   └── async-tasks/
    │       └── send-welcome-email.js
    └── [id]/
        ├── @get/               # GET /users/:id - 단일 조회
        │   └── steps/
        │       ├── 100-fetch-user.js
        │       └── 200-send-response.js
        ├── @put/               # PUT /users/:id - 수정
        │   └── steps/
        │       ├── 100-validate.js
        │       ├── 200-update-user.js
        │       └── 300-send-response.js
        └── @delete/            # DELETE /users/:id - 삭제
            └── steps/
                ├── 100-delete-user.js
                └── 200-send-response.js
```

**얻는 것 (설정 제로):**
- [Good] 5개의 API 엔드포인트가 자동으로 등록됨
- [Good] 각 엔드포인트의 명확한 실행 순서
- [Good] 사용자 생성을 위한 백그라운드 이메일 작업
- [Good] 자기 문서화 구조

### 예제 2: 댓글 기능이 있는 블로그 API

**폴더 구조:**
```
features/
└── posts/
    ├── @get/                           # GET /posts
    ├── @post/                          # POST /posts
    └── [postId]/
        ├── @get/                       # GET /posts/:postId
        ├── @put/                       # PUT /posts/:postId
        ├── @delete/                    # DELETE /posts/:postId
        ├── publish/
        │   └── @patch/                 # PATCH /posts/:postId/publish
        └── comments/
            ├── @get/                   # GET /posts/:postId/comments
            ├── @post/                  # POST /posts/:postId/comments
            └── [commentId]/
                ├── @get/               # GET /posts/:postId/comments/:commentId
                ├── @put/               # PUT /posts/:postId/comments/:commentId
                └── @delete/            # DELETE /posts/:postId/comments/:commentId
```

**얻는 것:**
- [Good] 폴더 구조만으로 11개의 API 엔드포인트
- [Good] 중첩된 리소스 라우트 (게시글 → 댓글)
- [Good] 커스텀 액션 라우트 (게시)
- [Good] 여러 라우트 파라미터

### 예제 3: 파일 업로드 서비스

**폴더 구조:**
```
features/
└── uploads/
    ├── @post/                          # POST /uploads
    │   ├── steps/
    │   │   ├── 100-validate-file.js
    │   │   ├── 200-upload-to-s3.js
    │   │   ├── 300-create-record.js
    │   │   └── 400-send-response.js
    │   └── async-tasks/
    │       ├── generate-thumbnail.js
    │       ├── scan-for-virus.js
    │       └── update-search-index.js
    └── [id]/
        ├── @get/                       # GET /uploads/:id
        │   └── steps/
        │       ├── 100-fetch-upload.js
        │       ├── 200-generate-signed-url.js
        │       └── 300-send-response.js
        └── @delete/                    # DELETE /uploads/:id
            └── steps/
                ├── 100-delete-from-s3.js
                ├── 200-delete-record.js
                └── 300-send-response.js
```

**작동하는 규약:**
- `@post/` → POST 메서드
- `steps/100-*` → 먼저 실행
- `async-tasks/` → 응답 후 실행 (썸네일 생성이 차단하지 않음)
- `[id]/` → 라우트 파라미터

---

## 규약 vs 설정

### 규약을 사용해야 할 때

**[Good] 다음의 경우 규약 사용:**
- 기본 동작이 요구사항에 맞을 때
- 최소한의 보일러플레이트를 원할 때
- 일관성과 발견 가능성을 중요시할 때
- 표준 REST API를 만들 때

**예제:**
```
users/@post/steps/100-validate.js
(파일만 만들면 작동합니다!)
```

### 설정을 사용해야 할 때

**[Good] 다음의 경우 설정 사용:**
- 커스텀 초기화가 필요할 때
- 커스텀 에러 처리가 필요할 때
- 기본값을 재정의해야 할 때

**예제:**
```javascript
// features/users/@post/index.js
module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    // 커스텀 초기화
    ctx.timestamp = Date.now()
    ctx.requestId = generateRequestId()
  },

  onError: async (error, ctx, req, res) => {
    // 커스텀 에러 처리
    await logError(error, ctx.requestId)
    res.status(500).json({
      error: '내부 서버 오류',
      requestId: ctx.requestId
    })
  }
})
```

### 규약과 설정 혼합

둘 다 혼합할 수 있습니다:

```
users/@post/
├── index.js              ← 설정 (선택사항)
├── steps/                ← 규약
│   ├── 100-validate.js
│   └── 200-create.js
└── async-tasks/          ← 규약
    └── send-email.js
```

**경험 법칙:**
- 규약으로 시작 (`index.js` 없이)
- 필요할 때만 설정 추가 (`index.js`)

---

## 베스트 프랙티스

### 1. **규약을 엄격하게 따르기**

일관성이 핵심입니다:

```
// [좋음]: 일관된 구조
features/users/@post/steps/100-validate.js
features/orders/@post/steps/100-validate.js
features/products/@post/steps/100-validate.js

// [나쁨]: 비일관적
features/users/@post/steps/100-validate.js
features/orders/create/steps/validate.js
features/products/createProduct/100-check.js
```

### 2. **설명적인 이름 사용**

목적을 명확하게:

```
// [좋음]
100-validate-email-format.js
200-check-user-exists.js
300-hash-password.js

// [나쁨]
100-validate.js
200-check.js
300-hash.js
```

### 3. **규약에 맞서 싸우지 말기**

많은 설정이 필요하다면, 구조를 재고하세요:

```
// [나쁨]: 규약에 맞서 싸움
features/users/createUser/@post/
// 왜 이렇게 하지 않나요: features/users/@post/

// [좋음]: 규약을 따름
features/users/@post/
```

### 4. **자동 발견 활용**

프레임워크가 기능을 발견하게 하세요:

```javascript
// [좋음]: 자동 발견
const router = await createFeatureRouter('./features')
app.use(router)

// [나쁨]: 수동 등록
app.post('/users', userController.create)
app.get('/users', userController.list)
// ... (많은 수동 라우트)
```

### 5. **편차 문서화**

규약에서 벗어나야 한다면, 이유를 문서화하세요:

```javascript
// features/special-case/@post/index.js

// 참고: 이 기능은 외부 서비스에 에러를 로그해야 하므로
// 커스텀 에러 핸들러를 사용합니다
module.exports = feature({
  onError: async (error, ctx, req, res) => {
    await externalLogger.log(error)
    res.status(500).json({ error: error.message })
  }
})
```

### 6. **Step 번호에 간격 사용**

미래의 Steps를 위한 공간을 남겨두세요:

```
// [좋음]: 새 Steps 삽입이 쉬움
100-validate.js
200-process.js
300-respond.js

// 100과 200 사이에 무언가를 추가하고 싶다면?
100-validate.js
150-sanitize.js  ← 쉽습니다!
200-process.js

// [나쁨]: 삽입이 어려움
1-validate.js
2-process.js
3-respond.js
// 이제 어떻게? 1.5-xxx.js?
```

### 7. **관련 기능 그룹화**

폴더를 사용해 관련 기능을 그룹화:

```
features/
├── auth/
│   ├── login/@post/
│   ├── logout/@post/
│   └── refresh/@post/
├── users/
│   ├── @get/
│   └── @post/
└── admin/
    ├── users/@get/
    └── stats/@get/
```

---

## 요약

**Convention over Configuration**은 다음을 의미합니다:

1. **폴더 구조가 라우트를 정의** - 라우트 설정 파일 없음
2. **`@method/`가 HTTP 메서드 정의** - 메서드 등록 없음
3. **`[param]/`이 파라미터 정의** - 라우트 파라미터 설정 없음
4. **숫자 접두사가 순서 정의** - 실행 순서 설정 없음
5. **파일 이름이 자기 문서화** - 별도 문서 불필요

**결과:**
- [Good] 더 적은 보일러플레이트
- [Good] 더 빠른 개발
- [Good] 더 나은 발견 가능성
- [Good] 강제된 일관성
- [Good] 더 쉬운 유지보수

**폴더 구조가 바로 설정입니다.**

---

**다음 단계:**
- [Feature-First 아키텍처 가이드](./feature-first-architecture.ko.md)
- [express-numflow README](../README.ko.md)
- [Todo 앱 예제](../examples/todo-app/)
