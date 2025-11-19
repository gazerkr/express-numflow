# express-numflow

> Express를 위한 Feature-First 아키텍처 플러그인 - [Numflow](https://github.com/gazerkr/numflow)의 Convention over Configuration을 Express 앱에서 사용하세요

[![npm version](https://img.shields.io/npm/v/express-numflow.svg)](https://www.npmjs.com/package/express-numflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | **한국어**

## express-numflow란?

**express-numflow**는 [Numflow](https://github.com/gazerkr/numflow)의 강력한 **Feature-First 아키텍처**를 기존 Express 애플리케이션에 적용할 수 있게 해줍니다. 복잡한 비즈니스 로직을 순차적인 Steps로 분리하고, 기능별로 코드를 정리하며, 폴더 구조만으로 API를 정의할 수 있습니다 - Express 설정을 변경하지 않고도 말이죠.

### 주요 기능

- **Convention over Configuration** - 폴더 구조가 HTTP 메서드와 경로를 자동으로 정의
- **순차적 Steps** - 복잡한 로직을 번호가 매겨진 자동 실행 Steps로 분할
- **Async Tasks** - 응답을 차단하지 않는 백그라운드 작업
- **Express 호환** - 기존 Express 앱 및 미들웨어와 함께 동작
- **Zero Config** - 선택적인 `index.js` 파일, 최대한의 자동화
- **타입 안전** - 완전한 TypeScript 지원

---

## 설치

```bash
npm install express express-numflow
```

**요구사항:**

- Node.js >= 14.0.0
- Express ^4.0.0 || ^5.0.0

---

## 빠른 시작

```javascript
const express = require("express");
const { createFeatureRouter } = require("express-numflow");

const app = express();
app.use(express.json());

// 폴더 구조에서 Feature Router 생성
const featureRouter = await createFeatureRouter("./features");
app.use(featureRouter);

app.listen(3000);
```

---

## Convention over Configuration

### 폴더 구조 = API

```
features/
  api/
    users/
      @post/                 ← POST /api/users
        steps/
          100-validate.js
          200-create-user.js
        async-tasks/
          send-welcome-email.js
      [id]/
        @get/                ← GET /api/users/:id
          steps/
            100-fetch-user.js
```

### HTTP 메서드

`@` 접두사로 HTTP 메서드를 정의하세요:

```
@get     → GET
@post    → POST
@put     → PUT
@patch   → PATCH
@delete  → DELETE
```

### 동적 라우트

라우트 파라미터는 `[param]` 폴더를 사용하세요:

```
users/[id]/@get/     → GET /users/:id
posts/[postId]/comments/[commentId]/@get/
  → GET /posts/:postId/comments/:commentId
```

---

## Feature 구조

### Explicit Feature (`index.js` 있음)

```javascript
// features/api/orders/@post/index.js
const { feature } = require("express-numflow");

module.exports = feature({
  // method, path, steps 자동 추론!

  contextInitializer: (ctx, req, res) => {
    ctx.orderData = req.body;
  },

  onError: async (error, ctx, req, res) => {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  },
});
```

### Implicit Feature (`index.js` 불필요!)

```
features/
  greet/
    @get/
      steps/
        100-generate-greeting.js
        200-send-response.js
```

이게 전부입니다! 설정 파일이 필요 없습니다.

---

## Steps (순차 실행)

Steps는 숫자 순서대로 **순차적으로** 실행됩니다:

```javascript
// features/api/orders/@post/steps/100-validate.js
module.exports = async (ctx, req, res) => {
  if (!ctx.orderData.productId) {
    throw new Error("상품 ID가 필요합니다");
  }
  ctx.validated = true;
};
```

```javascript
// features/api/orders/@post/steps/200-check-stock.js
module.exports = async (ctx, req, res) => {
  const inStock = await checkStock(ctx.orderData.productId);
  if (!inStock) {
    throw new Error("상품 재고 부족");
  }
  ctx.stockChecked = true;
};
```

```javascript
// features/api/orders/@post/steps/300-create-order.js
module.exports = async (ctx, req, res) => {
  const orderId = await createOrder(ctx.orderData);

  res.status(201).json({
    success: true,
    orderId,
  });
};
```

**흐름**: 100 → 200 → 300 (자동!)

### 왜 Numeric Flow인가?

숫자 접두사 패턴(`100-`, `200-`, `300-`)은 **실행 순서를 가시화**하기 위한 의도적인 설계 선택입니다.

#### 철학: 암묵적인 동작을 명시적으로

전통적인 코드베이스에서 실행 순서는 다음과 같은 곳에 숨겨져 있습니다:

- 설정 파일 (찾기 어려움)
- 코드 주석 (쉽게 구식이 됨)
- 멘탈 모델 (공유하기 어려움)
- 런타임 동작 (실행하기 전까지 보이지 않음)

**Numflow는 실행 순서를 파일 시스템 자체에서 볼 수 있게 만듭니다.**

#### 장점

1. **즉각적인 이해**

   ```
   steps/
     100-validate.js      ← Step 1: 제일 먼저 실행
     200-check-stock.js   ← Step 2: 두 번째로 실행
     300-create-order.js  ← Step 3: 세 번째로 실행
   ```

   코드나 문서를 읽을 필요 없이 순서가 **자기 문서화**됩니다.

2. **쉬운 재구성**
   - 유효성 검증과 재고 확인 사이에 새로운 단계를 추가하고 싶으신가요?
   - 그냥 `150-check-user-limit.js`를 만들면 됩니다
   - 설정 파일을 업데이트할 필요 없습니다!

3. **자연스러운 정렬**
   - 파일 탐색기가 자동으로 숫자순으로 정렬
   - 팀의 모든 사람이 같은 뷰를 봅니다
   - 알파벳 혼란 없음 (`a-`, `b-`, `c-`는 확장성이 없음)

4. **명확한 의존성**
   - Step 200은 Step 100의 데이터를 안전하게 사용할 수 있습니다
   - Step 300은 Step 100과 200의 데이터를 안전하게 사용할 수 있습니다
   - 흐름이 숫자로부터 명확합니다

5. **더 나은 온보딩**
   - 새로운 개발자가 실행 흐름을 즉시 파악합니다
   - 미들웨어 체인을 추적할 필요가 없습니다
   - 인지 부하 감소

#### 대안들과 우리가 선택하지 않은 이유

| 접근 방식                          | 선택하지 않은 이유                                 |
| ---------------------------------- | -------------------------------------------------- |
| **알파벳 순서 (`a-`, `b-`, `c-`)** | 단계 삽입이 어렵고, 26단계 이후 끝남               |
| **접두사 없음**                    | 디렉토리 순서나 설정 파일에 의존 (명시적이지 않음) |
| **날짜/타임스탬프**                | 읽는 사람에게 무의미하고, 순서 이해가 어려움       |
| **의존성 그래프**                  | 복잡하고, 시각화를 위한 추가 도구 필요             |

#### 결과: 자기 문서화 코드

Feature 디렉토리를 열면 즉시 다음을 알 수 있습니다:

- 어떤 단계들이 존재하는지
- 어떤 순서로 실행되는지
- 어디에 새로운 단계를 추가해야 하는지

**README가 필요 없습니다. 유지보수할 문서도 없습니다. 폴더 구조 자체가 문서입니다.**

이것이 Convention over Configuration의 본질입니다 - **구조가 스스로 말하게 하세요**.

---

## Async Tasks (백그라운드 실행)

Async tasks는 응답을 차단하지 않고 **백그라운드**에서 실행됩니다:

```javascript
// features/api/orders/@post/async-tasks/send-confirmation-email.js
module.exports = async (ctx) => {
  await sendEmail({
    to: ctx.orderData.email,
    subject: "주문 확인",
    body: `주문 번호 #${ctx.orderId}가 접수되었습니다!`,
  });
};
```

```javascript
// features/api/orders/@post/async-tasks/update-analytics.js
module.exports = async (ctx) => {
  await analytics.track("order_created", {
    orderId: ctx.orderId,
    productId: ctx.orderData.productId,
  });
};
```

**응답은 즉시 전송되고, tasks는 백그라운드에서 실행됩니다!**

---

## 기존 Express 앱과의 통합

### Express 라우트와 공존

```javascript
const express = require("express");
const { createFeatureRouter } = require("express-numflow");

const app = express();

// 기존 Express 라우트 (변경 없음)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/legacy", legacyRouter);

// Feature-First 라우트 추가
const featureRouter = await createFeatureRouter("./features");
app.use(featureRouter);

app.listen(3000);
```

### 다른 경로에 마운트

```javascript
// API v2는 Feature-First로
const apiV2Router = await createFeatureRouter("./features/api-v2");
app.use("/api/v2", apiV2Router);

// 관리자 페널
const adminRouter = await createFeatureRouter("./features/admin");
app.use("/admin", adminRouter);
```

---

## API 레퍼런스

### `createFeatureRouter(featuresDir, options?)`

Features 디렉토리에서 Express Router를 생성합니다.

**파라미터:**

- `featuresDir` (string): features 디렉토리 경로
- `options` (object, 선택사항):
  - `indexPatterns` (string[]): index 파일 패턴 (기본값: `['index.js', 'index.ts', 'index.mjs', 'index.mts']`)
  - `excludeDirs` (string[]): 제외할 디렉토리 (기본값: `['node_modules', '.git', 'dist', 'build']`)
  - `debug` (boolean): 디버그 로깅 활성화 (기본값: `false`)
  - `routerOptions` (object): Express Router 옵션

**반환:** `Promise<Router>`

**예제:**

```javascript
const router = await createFeatureRouter("./features", {
  debug: true,
  excludeDirs: ["node_modules", "test"],
});

app.use(router);
```

---

## 예제

`/examples` 디렉토리에서 완전한 예제를 확인하세요:

- **[Todo 앱](./examples/todo-app/)** - Feature-First 아키텍처를 보여주는 완전한 기능의 Todo 애플리케이션:
  - Feature-First 아키텍처
  - Steps를 이용한 CRUD 작업
  - 에러 처리
  - 통합 테스트

---

## 왜 express-numflow인가?

| 이전 (Express)              | 이후 (express-numflow) |
| --------------------------- | ---------------------- |
| 수동 라우트 등록            | 폴더 구조 = API        |
| 복잡한 라우트 핸들러        | 순차적 Steps           |
| 분산된 비즈니스 로직        | Feature별로 정리       |
| 백그라운드 작업 = 추가 설정 | 내장 Async Tasks       |
| 많은 보일러플레이트         | Convention over Config |

---

## 마이그레이션 경로

1. **작게 시작**: 새 엔드포인트만 Feature-First로 추가
2. **공존**: 기존 Express 라우트는 그대로 유지
3. **점진적 리팩토링**: 복잡한 라우트를 시간을 두고 Features로 마이그레이션
4. **완전한 도입**: 나중에 3.3배 빠른 라우팅을 위해 [Numflow](https://github.com/gazerkr/numflow)로 마이그레이션

---

## Numflow와의 비교

어떤 것을 선택해야 할지 고민이신가요? 비교표를 확인하세요:

| 기능                   | express-numflow          | [Numflow](https://github.com/gazerkr/numflow)                          |
| ---------------------- | ------------------------ | -------------------------------- |
| Feature-First          | Yes                      | Yes                              |
| Convention over Config | Yes                      | Yes                              |
| Express 호환           | Yes                      | Yes                              |
| 고성능 라우팅          | No (Express 라우터 사용) | Yes (Radix Tree, 3.3배 빠름)      |
| 드롭인 대체            | Yes                      | Limited (마이그레이션 필요)           |
| 사용 사례              | 점진적 도입              | 신규 프로젝트, 완전 마이그레이션 |

**추천**: `express-numflow`로 시작하고, 성능이 필요할 때 [Numflow](https://github.com/gazerkr/numflow)로 마이그레이션하세요.

---

## 성능

### 벤치마크 결과 (Express 5.x)

[autocannon](https://github.com/mcollina/autocannon)을 사용한 순수 Express와 express-numflow의 성능 비교:

**테스트 환경:**

- 도구: autocannon
- 동시 연결: 100개
- 테스트 시간: 시나리오당 10초
- 워밍업: 3초

#### 결과 요약

| 시나리오               | 순수 Express    | express-numflow | 차이       |
| ---------------------- | --------------- | --------------- | ---------- |
| **단순 GET**           | 233,074 req/10s | 220,123 req/10s | -5.56%     |
|                        | 평균 4.33ms     | 평균 4.19ms     | -3.23% (더 나음)  |
| **POST + 유효성 검증** | 204,358 req/10s | 200,006 req/10s | -2.13%     |
|                        | 평균 4.93ms     | 평균 4.41ms     | -10.55% (더 나음) |
| **복잡한 다단계**      | 203,102 req/10s | 190,728 req/10s | -6.09%     |
|                        | 평균 5.01ms     | 평균 5.38ms     | +7.39%     |

#### 주요 발견사항

- **처리량**: Feature 시스템 오버헤드로 인해 순수 Express 대비 2-6% 낮음
- **레이턴시**: 단순 시나리오에서는 비슷하거나 더 좋으며, 복잡한 다단계 작업에서는 약간 증가
- **트레이드오프**: 작은 성능 비용으로 훨씬 나은 코드 구조화 및 유지보수성 확보

**직접 벤치마크 실행:**

```bash
npm run benchmark
```

> **참고**: 성능 오버헤드는 미미하며 대부분의 애플리케이션에서 허용 가능합니다. Feature-First 아키텍처의 이점(더 나은 구조화, 유지보수성, 개발자 생산성)이 일반적으로 작은 성능 비용보다 훨씬 큽니다.

---

## 테스트

express-numflow는 안정성과 신뢰성을 보장하기 위해 철저하게 테스트되었습니다.

### 테스트 결과

```bash
Test Suites: 9 passed, 9 total
Tests:       200 passed, 200 total
Coverage:    73.74% statements, 62.09% branches, 76.06% functions, 73.57% lines
```

### 모듈별 테스트 커버리지

| 모듈 | 커버리지 | 상태 |
|--------|----------|--------|
| `retry.ts` | 100% | 매우 좋음 |
| `type-guards.ts` | 100% | 매우 좋음 |
| `errors/index.ts` | 100% | 매우 좋음 |
| `auto-error-handler.ts` | 90.9% | 매우 좋음 |
| `feature-scanner.ts` | 89.18% | 좋음 |
| `convention.ts` | 86.84% | 좋음 |
| `create-feature-router.ts` | 83.33% | 좋음 |
| `async-task-scheduler.ts` | 72.22% | 양호 |

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 커버리지와 함께 테스트 실행
npm run test:coverage

# 특정 테스트 파일 실행
npm test -- convention.test.ts
```

**테스트 스위트 포함 내용:**
- Convention 시스템 테스트 (폴더 구조를 API로 매핑)
- Feature 실행 테스트 (steps, context, 에러 처리)
- Retry 메커니즘 테스트
- HTTP 에러 클래스 테스트
- Type guards 테스트
- 자동 에러 핸들러 테스트
- 비동기 작업 스케줄러 테스트
- Express 통합 테스트
- 엣지 케이스 테스트

---

## 더 알아보기

- [API 레퍼런스](./docs/api-reference.ko.md) - 완전한 API 문서
- [Feature-First 아키텍처 가이드](./docs/feature-first-architecture.ko.md)
- [Convention over Configuration](./docs/convention-over-configuration.ko.md)
- [경로 별칭(Path Aliasing) 가이드](./docs/path-aliasing.ko.md)
- [Todo 앱 예제](./examples/todo-app/)

---

## 경로 별칭(Path Aliasing)

깊은 폴더 중첩은 긴 상대 경로를 만듭니다. **경로 별칭**을 사용해 import를 깔끔하게 유지하세요:

### 이전 (긴 상대 경로)

```javascript
// features/api/v2/users/[id]/posts/@get/steps/100-fetch.js
const db = require("../../../../../../../db"); // 나쁨
```

### 이후 (깔끔한 별칭)

```javascript
// features/api/v2/users/[id]/posts/@get/steps/100-fetch.js
const db = require("#db"); // 좋음
```

### 빠른 설정 (Node.js >= 14.6)

`package.json`에 추가:

```json
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js"
  }
}
```

그런 다음 코드에서 사용:

```javascript
const db = require("#db");
const { sendEmail } = require("#lib/email");
const { validateEmail } = require("#lib/validators");
```

**다른 솔루션:**

- **module-alias** - 구 버전 Node.js용
- **TypeScript paths** - TypeScript 프로젝트용

자세한 전략과 베스트 프랙티스는 [경로 별칭 가이드](./docs/path-aliasing.ko.md)를 참고하세요.

---

## 문제 해결

### Features가 로드되지 않나요?

디버그 출력을 확인하세요:

```javascript
const router = await createFeatureRouter("./features", { debug: true });
```

### TypeScript 에러?

타입 정의가 설치되어 있는지 확인하세요:

```bash
npm install --save-dev @types/express
```

---

## 라이센스

MIT © [Numflow Team](https://github.com/gazerkr/numflow)

---

## 기여하기

기여를 환영합니다! 자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

---

## 별 주세요!

express-numflow가 유용하다면 GitHub에서 별을 주세요!

---

**[Numflow 팀](https://github.com/gazerkr/numflow)이 만들었습니다**
