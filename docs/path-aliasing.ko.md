# 경로 별칭(Path Aliasing) 가이드

## 목차

- [문제점](#문제점)
- [해결책 1: Node.js Subpath Imports (권장)](#해결책-1-nodejs-subpath-imports-권장)
- [해결책 2: module-alias 패키지](#해결책-2-module-alias-패키지)
- [해결책 3: TypeScript Paths](#해결책-3-typescript-paths)
- [비교](#비교)
- [베스트 프랙티스](#베스트-프랙티스)
- [일반적인 패턴](#일반적인-패턴)

---

## 문제점

Feature-First 아키텍처에서 깊은 폴더 중첩은 **길고 오류가 발생하기 쉬운 상대 경로**를 만듭니다:

```javascript
// features/api/v2/users/[id]/posts/[postId]/comments/@post/steps/100-validate.js

const db = require('../../../../../../../../../db')  // [나쁨]
const { sendEmail } = require('../../../../../../../../../lib/email')  // [나쁨]
const { validate } = require('../../../../../../../../../lib/validators')  // [나쁨]
```

**문제점:**
- 읽고 유지하기 어려움
- 실수하기 쉬움 (`../`의 개수가 틀릴 수 있음)
- 파일을 이동하면 깨짐
- IDE 자동완성이 잘 작동하지 않음
- 리팩토링이 고통스러움

---

## 해결책 1: Node.js Subpath Imports (권장)

**사용 가능:** Node.js >= 14.6.0
**의존성 제로** [좋음]

### 설정

`package.json`에 `imports` 필드 추가:

```json
{
  "name": "my-app",
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js",
    "#config": "./config/index.js"
  }
}
```

### 사용법

```javascript
// 이전
const db = require('../../../../../../../../../db')
const { sendEmail } = require('../../../../../../../../../lib/email')
const { validateEmail } = require('../../../../../../../../../lib/validators')

// 이후
const db = require('#db')
const { sendEmail } = require('#lib/email')
const { validateEmail } = require('#lib/validators')
```

### 장점

[좋음] **의존성 제로** - Node.js에 내장
[좋음] **표준** - 공식 Node.js 기능
[좋음] **어디서나 작동** - 빌드 단계 불필요
[좋음] **빠름** - 런타임 오버헤드 없음
[좋음] **간단** - package.json만 수정하면 됨

### 단점

[나쁨] **Node.js 14.6+ 필요**
[나쁨] **`#`으로 시작해야 함** - `@`나 일반 이름 사용 불가
[나쁨] **패키지 범위만** - 외부 패키지 별칭 불가

### 예제: Todo 앱

**package.json:**
```json
{
  "name": "todo-app",
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*"
  }
}
```

**사용:**
```javascript
// features/todos/[id]/complete/@patch/steps/100-mark-completed.js
const db = require('#db')  // [좋음] 깔끔!

module.exports = async (ctx, req, res) => {
  const todo = db.markAsCompleted(req.params.id)
  ctx.todo = todo
}
```

---

## 해결책 2: module-alias 패키지

**패키지:** [module-alias](https://www.npmjs.com/package/module-alias)
**호환:** 모든 Node.js 버전

### 설정

#### 1. 설치

```bash
npm install module-alias
```

#### 2. package.json 설정

```json
{
  "name": "my-app",
  "_moduleAliases": {
    "@root": ".",
    "@db": "./db.js",
    "@lib": "./lib",
    "@utils": "./utils",
    "@config": "./config"
  }
}
```

#### 3. 별칭 등록 (진입 파일에서)

```javascript
// server.js (또는 index.js)
require('module-alias/register')  // [주의] 제일 먼저!

const express = require('express')
const db = require('@db')  // 이제 작동합니다!

// 나머지 코드...
```

### 사용법

```javascript
// 이전
const db = require('../../../../../../../../../db')
const { sendEmail } = require('../../../../../../../../../lib/email')

// 이후
const db = require('@db')
const { sendEmail } = require('@lib/email')
```

### 장점

[좋음] **구 버전 Node.js 지원** - 버전 제한 없음
[좋음] **유연한 접두사** - `@`, `~` 또는 아무거나 사용 가능
[좋음] **node_modules 별칭 가능** - 외부 패키지도 별칭 가능
[좋음] **검증됨** - 주간 다운로드 200만+ 인기 패키지

### 단점

[나쁨] **추가 의존성**
[나쁨] **등록 필요** - `require('module-alias/register')` 호출 필수
[나쁨] **런타임 오버헤드** - Node의 모듈 시스템에 후킹
[나쁨] **문제 발생 가능** - 일부 도구가 이해하지 못함 (Jest, 번들러)

### 예제

**package.json:**
```json
{
  "name": "my-app",
  "_moduleAliases": {
    "@root": ".",
    "@db": "./db.js",
    "@lib": "./lib",
    "@features": "./features"
  }
}
```

**server.js:**
```javascript
require('module-alias/register')  // 제일 먼저!

const express = require('express')
const db = require('@db')
const { createFeatureRouter } = require('express-numflow')

const app = express()
app.use(express.json())

const featureRouter = await createFeatureRouter('@features')
app.use(featureRouter)

app.listen(3000)
```

**Step 파일:**
```javascript
// features/users/@post/steps/200-create-user.js
const db = require('@db')
const { sendEmail } = require('@lib/email')

module.exports = async (ctx, req, res) => {
  const user = await db.users.create(ctx.userData)
  await sendEmail(user.email, '환영합니다!')
  ctx.user = user
}
```

---

## 해결책 3: TypeScript Paths

**대상:** TypeScript 프로젝트
**필요:** TypeScript + 번들러 또는 ts-node

### 설정

#### 1. tsconfig.json 설정

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@db": ["./db"],
      "@lib/*": ["./lib/*"],
      "@utils/*": ["./utils/*"],
      "@features/*": ["./features/*"]
    }
  }
}
```

#### 2. 프로덕션용 (하나 선택)

**옵션 A: tsconfig-paths 사용**

```bash
npm install tsconfig-paths
```

```javascript
// server.ts
import 'tsconfig-paths/register'  // 제일 먼저

import express from 'express'
import db from '@db'  // 작동합니다!
```

**옵션 B: 번들러 사용**

번들러 (webpack, esbuild 등)는 TypeScript paths를 자동으로 이해합니다.

### 사용법

```typescript
// 이전
import db from '../../../../../../../../../db'
import { sendEmail } from '../../../../../../../../../lib/email'

// 이후
import db from '@db'
import { sendEmail } from '@lib/email'
```

### 장점

[좋음] **완전한 IDE 지원** - VSCode 자동완성이 완벽하게 작동
[좋음] **타입 안전** - TypeScript가 별칭을 알고 있음
[좋음] **유연함** - 모든 경로 매핑 가능
[좋음] **번들러 친화적** - webpack, esbuild가 이해함

### 단점

[나쁨] **TypeScript 전용** - 순수 JavaScript에서 작동 안 함
[나쁨] **런타임 지원 필요** - tsconfig-paths나 번들러 필요
[나쁨] **빌드 단계 필요** - 보통 .ts 파일을 직접 실행 불가

### 예제

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "baseUrl": ".",
    "paths": {
      "@db": ["./db"],
      "@lib/*": ["./lib/*"],
      "@config": ["./config"]
    }
  }
}
```

**Step 파일:**
```typescript
// features/users/@post/steps/200-create-user.ts
import db from '@db'
import { sendEmail } from '@lib/email'
import { User } from '@lib/types'

export default async (ctx: any, req: any, res: any) => {
  const user: User = await db.users.create(ctx.userData)
  await sendEmail(user.email, '환영합니다!')
  ctx.user = user
}
```

---

## 비교

| 기능 | Subpath Imports (#) | module-alias (@) | TypeScript paths |
|------|-------------------|-----------------|------------------|
| **Node.js 버전** | >= 14.6.0 | 모두 | 모두 (ts-node 사용 시) |
| **의존성** | 없음 | 1개 패키지 | tsconfig-paths 또는 번들러 |
| **설정 복잡도** | 쉬움 | 중간 | 중간 |
| **성능** | 최고 (네이티브) | 좋음 | 좋음 (빌드 후) |
| **접두사** | `#` 필수 | 아무거나 (`@`, `~` 등) | 아무거나 |
| **IDE 지원** | 좋음 | 좋음 | 탁월함 |
| **TypeScript** | 작동함 | 작동함 | 네이티브 |
| **순수 JavaScript** | [좋음] 예 | [좋음] 예 | [나쁨] 아니오 |
| **런타임 오버헤드** | 없음 | 최소 | 없음 (번들됨) |
| **도구 호환성** | 탁월함 | 좋음 | 탁월함 |

---

## 베스트 프랙티스

### 1. **한 가지 전략 선택**

여러 전략을 섞지 마세요 - 하나를 선택하고 유지하세요:

```javascript
// [나쁨]: 전략 혼합
const db = require('#db')           // Subpath imports
const utils = require('@utils')     // module-alias
import config from '@/config'       // TypeScript

// [좋음]: 일관성
const db = require('#db')
const utils = require('#utils')
const config = require('#config')
```

### 2. **설명적인 별칭 사용**

각 별칭이 무엇을 나타내는지 명확하게:

```json
// [좋음]
{
  "imports": {
    "#db": "./database/index.js",
    "#models/*": "./database/models/*.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js"
  }
}

// [나쁨]: 불명확
{
  "imports": {
    "#d": "./database/index.js",
    "#m/*": "./database/models/*.js",
    "#l/*": "./lib/*.js"
  }
}
```

### 3. **별칭 문서화**

package.json에 주석 추가:

```json
{
  "name": "my-app",
  "imports": {
    // 핵심
    "#db": "./db.js",

    // 라이브러리
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js",

    // 설정
    "#config": "./config/index.js"
  }
}
```

### 4. **공유 코드에만 별칭 사용, Feature는 제외**

자주 사용되는 모듈에만 별칭을 사용하고, Feature별 코드에는 사용하지 마세요:

```json
// [좋음]: 공유 유틸리티
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js"
  }
}

// [나쁨]: Feature별
{
  "imports": {
    "#users-feature": "./features/users",
    "#orders-feature": "./features/orders"
  }
}
```

**이유?** Feature는 독립적이어야 합니다. Feature A가 Feature B에 의존한다면 설계 문제일 수 있습니다.

### 5. **같은 Feature 내에서는 상대 경로 유지**

교차 관심사에는 별칭을, Feature 내부에서는 상대 경로를:

```javascript
// [좋음]: 같은 Feature, 상대 경로 사용
// features/users/@post/steps/200-create-user.js
const helpers = require('../helpers')  // 같은 Feature

// [좋음]: 공유 코드, 별칭 사용
const db = require('#db')              // Feature 간 공유
```

---

## 일반적인 패턴

### 패턴 1: 데이터베이스 + 라이브러리

```json
{
  "imports": {
    "#db": "./database/index.js",
    "#lib/*": "./lib/*.js"
  }
}
```

```javascript
// 모든 Step 파일
const db = require('#db')
const { sendEmail } = require('#lib/email')
const { validateEmail } = require('#lib/validators')
```

### 패턴 2: 타입별 구성

```json
{
  "imports": {
    "#db": "./db.js",
    "#models/*": "./models/*.js",
    "#services/*": "./services/*.js",
    "#utils/*": "./utils/*.js",
    "#config": "./config/index.js"
  }
}
```

```javascript
const db = require('#db')
const User = require('#models/User')
const emailService = require('#services/email')
const { formatDate } = require('#utils/date')
const config = require('#config')
```

### 패턴 3: Feature + 공유

```json
{
  "imports": {
    "#shared/*": "./shared/*.js",
    "#db": "./db.js"
  }
}
```

```javascript
const db = require('#db')
const { validateInput } = require('#shared/validators')
const { logger } = require('#shared/logger')
```

---

## 마이그레이션 가이드

### 상대 경로에서 마이그레이션

**Step 1:** package.json에 imports 추가

```json
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js"
  }
}
```

**Step 2:** 찾기 및 바꾸기

IDE의 찾기 및 바꾸기 (정규식 사용):

**찾기:**
```
require\('\.\.\/+db'\)
```

**바꾸기:**
```
require('#db')
```

**Step 3:** 테스트

```bash
npm test
node server.js
```

**Step 4:** 커밋

```bash
git add .
git commit -m "refactor: 상대 경로 대신 경로 별칭 사용"
```

---

## 문제 해결

### "Cannot find module '#db'"

**원인:** Node.js 버전 < 14.6.0 또는 package.json이 올바른 위치에 없음

**해결:**
```bash
# Node.js 버전 확인
node --version  # >= 14.6.0이어야 함

# package.json이 프로젝트 루트에 있는지 확인
ls package.json  # 존재해야 함

# imports 필드가 존재하는지 확인
cat package.json | grep imports
```

### "Module not found: package subpath"

**원인:** imports의 경로가 존재하지 않음

**해결:** 파일이 존재하는지 확인:
```bash
# imports에 다음이 있다면:
# "#db": "./db.js"

# 이것이 존재해야 함:
ls db.js  # 존재해야 함
```

### IDE에서 "Cannot find module" 표시

**원인:** IDE가 subpath imports를 이해하지 못함

**해결:** IDE 재시작 또는 jsconfig.json/tsconfig.json 추가:

```json
// jsconfig.json (JavaScript 프로젝트용)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "#db": ["./db.js"],
      "#lib/*": ["./lib/*"]
    }
  }
}
```

---

## 요약

**권장사항:**

1. **새 프로젝트 (Node.js >= 14.6):** **Subpath Imports** (`#`) 사용
2. **구 버전 Node.js:** **module-alias** (`@`) 사용
3. **TypeScript:** **TypeScript paths** + tsconfig-paths 사용

**빠른 시작:**

```json
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js"
  }
}
```

```javascript
const db = require('#db')
const { sendEmail } = require('#lib/email')
```

**끝!** 이제 더 이상 `../../../../../../`가 없습니다

---

**참고:**
- [Feature-First 아키텍처 가이드](./feature-first-architecture.ko.md)
- [Convention over Configuration](./convention-over-configuration.ko.md)
- [Todo 앱 예제](../examples/todo-app/)
