# 학과 방명록 (DeptGuest) — PRD v1.0

> **최종 업데이트**: 2026-05-15
> **작성자**: IT 서비스 기획자
> **대상 독자**: 프론트엔드 / 백엔드 개발자

---

## 1. 5W1H

| 항목 | 내용 | 비고 |
|------|------|------|
| **Who** | 국내 대학생 (주로 학부 재학생/졸업생) | 학과 단위 커뮤니티로 진입 |
| **What** | 학과별 익명 방명록 웹 서비스 | 글쓰기, 댓글, 반응, 검색, 실시간 피드 |
| **Why** | 학과 내 후배에게 조언 전달, 경험 공유, 소속감 형성의 장 부재 | 기쵹 카페/단톡은 정보가 묻힘 |
| **Where** | 웹 (모바일 최적화) | URL 공유로 진입, 앱 설치 불필요 |
| **When** | 등급금/과제 끝난 밤, 수강신청 시즌, 취업 준비 시기 등 수요 급증 | 24/7 이용 가능 |
| **How** | 학과 코드 선택 → 인증(이메일/도메인) → 글 작성 및 열람 | Supabase 기반 BaaS로 빠른 런칭 |

---

## 2. 기능 상세 정의

### 2.1 인증 및 온보딩

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| A-01 | 학과 선택 | 대학교 → 단과대 → 학과 3단계 셀렉터로 진입 | P0 |
| A-02 | 이메일 인증 | `@univ.ac.kr` 도메인 또는 학생증 인증으로 소속 확인 | P0 |
| A-03 | 닉네임 설정 | 익명 닉네임 자동 생성 (예: "경영학과 23학번 군인") + 커스텀 가능 | P0 |
| A-04 | 비회원 열람 | 로그인 없이 해당 학과 방명록 열람 가능 (글쓰기 불가) | P1 |

> **인증 UX 핵심**: 첫 방문 시 학과 선택만으로 즉시 해당 학과 방명록 피드 진입. 글 작성 시점에 인증을 요청하여 이탈 최소화.

---

### 2.2 방명록 게시글 (Post)

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| P-01 | 글 작성 | 본문(최대 2,000자), 카테고리 태그, 익명 여부 선택 | P0 |
| P-02 | 카테고리 태그 | `수업후기` `교수님` `취업/인턴` `동아리` `인간관계` `자유` (확장 가능) | P0 |
| P-03 | 학번대 공개 | 작성자 학번대 선택적 공개 (예: "21학번", "19-20학번") — 기본 비공개 | P0 |
| P-04 | 사진 첨부 | 1건당 최대 3장, 용량 제한 5MB/장, Supabase Storage 저장 | P1 |
| P-05 | 임금/과제 핀 | 관리자(학과 대표)가 중요 게시글 상단 고정 | P1 |
| P-06 | 글 수정/삭제 | 작성자 본인만 가능, 삭제 시 "삭제된 글입니다" 표시 | P0 |

> **DB 스키마 (posts 테이블)**:
>
> | 컬럼 | 타입 | 제약 |
> |------|------|------|
> | `id` | `UUID` | PK, default `gen_random_uuid()` |
> | `department_id` | `UUID` | FK → departments, NOT NULL |
> | `user_id` | `UUID` | FK → auth.users, NOT NULL |
> | `category` | `VARCHAR(20)` | NOT NULL |
> | `content` | `TEXT` | NOT NULL, max 2000 chars |
> | `batch_range` | `VARCHAR(20)` | NULL (학번대 공개) |
> | `is_anonymous` | `BOOLEAN` | default `true` |
> | `is_pinned` | `BOOLEAN` | default `false` |
> | `image_urls` | `TEXT[]` | default `'{}'` |
> | `created_at` | `TIMESTAMPTZ` | default `now()` |
> | `deleted_at` | `TIMESTAMPTZ` | NULL (soft delete) |

---

### 2.3 댓글 (Comment)

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| C-01 | 댓글 작성 | 게시글에 대한 답글, 최대 500자 | P0 |
| C-02 | 대댓글 | 댓글에 답글 (1 depth까지만) | P0 |
| C-03 | 익명 댓글 | 게시글과 동일한 익명 정책 적용 | P0 |

> **DB 스키마 (comments 테이블)**:
>
> | 컬럼 | 타입 | 제약 |
> |------|------|------|
> | `id` | `UUID` | PK |
> | `post_id` | `UUID` | FK → posts, NOT NULL |
> | `user_id` | `UUID` | FK → auth.users, NOT NULL |
> | `parent_id` | `UUID` | FK → comments(id), NULL (대댓글용) |
> | `content` | `TEXT` | NOT NULL, max 500 chars |
> | `is_anonymous` | `BOOLEAN` | default `true` |
> | `created_at` | `TIMESTAMPTZ` | default `now()` |

---

### 2.4 반응 (Reaction)

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| R-01 | 이모지 반응 | 게시글에 ❤️ 👍 😢 🎉 반응 (토글 방식, 1인 1반응 1종류) | P0 |
| R-02 | 반응 수 집계 | 각 이모지별 개수 실시간 표시 | P0 |

> **DB 스키마 (reactions 테이블)**:
>
> | 컬럼 | 타입 | 제약 |
> |------|------|------|
> | `id` | `UUID` | PK |
> | `post_id` | `UUID` | FK → posts, NOT NULL |
> | `user_id` | `UUID` | FK → auth.users, NOT NULL |
> | `emoji` | `VARCHAR(4)` | NOT NULL |
> | `created_at` | `TIMESTAMPTZ` | default `now()` |
> | **Unique** | `(post_id, user_id)` | 1인당 1반응 |

---

### 2.5 피드 및 탐색

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-01 | 메인 피드 | 해당 학과 최신순 게시글 무한 스크롤 | P0 |
| F-02 | 카테고리 필터 | 태그별 필터링 (토글, 복수 선택 가능) | P0 |
| F-03 | 정렬 | 최신순(기본) / 반응 많은순 / 댓글 많은순 | P0 |
| F-04 | 검색 | 본문 키워드 검색 (Supabase full-text search 활용) | P1 |
| F-05 | 핀 게시글 | 상단에 고정된 공지/핀 게시물 분리 표시 | P0 |

---

### 2.6 알림 (Notification)

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| N-01 | 내 글 반응 알림 | 내가 쓴 글에 반응이 달릴 때 | P1 |
| N-02 | 내 글 댓글 알림 | 내가 쓴 글에 댓글이 달릴 때 | P1 |
| N-03 | 알림 목록 | 알림 페이지에서 확인, 읽음 처리 | P1 |

> P1이므로 MVP에서는 제외하고 v1.1에서 구현.

---

## 3. UX Flow

### 3.1 전체 화면 구조

```
┌─────────────────────────────────────────────┐
│  학과 방명록 (DeptGuest)                      │
│                                             │
│  [학과 셀렉터 ▼]           [알림] [프로필]    │
├─────────────────────────────────────────────┤
│                                             │
│  📌 핀 고정 게시물 (있을 경우)                │
│  ┌─────────────────────────────────────┐    │
│  │ [수업후기] 21학번 · 2시간 전          │    │
│  │ 이 수업 꼭 들어보세요...              │    │
│  │ ❤️ 42  👍 18                        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ── 카테고리 필터 ──                         │
│  [전체] [수업후기] [취업] [자유] [교수님]      │
│                                             │
│  ── 정렬 ──                                 │
│  최신순 | 반응순 | 댓글순                    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ [취업/인턴] 익명 · 30분 전            │    │
│  │ 3학년 여름인턴 어디서 구하셨나요...     │    │
│  │ 💬 12   ❤️ 28  👍 9                  │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ [자유] 22학번 · 1시간 전               │    │
│  │ 학식 오늘 진짜 맛있었음                │    │
│  │ 💬 3    ❤️ 7   👍 2                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│            (무한 스크롤)                     │
│                                             │
│                          ┌──────┐           │
│                          │ + 글  │           │
│                          └──────┘           │
└─────────────────────────────────────────────┘
```

### 3.2 핵심 사용자 플로우

```
[첫 방문]
   │
   ▼
┌─────────────┐
│ 학과 3단계   │
│ 셀렉터      │──── 미인증 → 게시글 열람만 가능
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 학과 피드    │
│ (메인 화면)  │
└──────┬──────┘
       │
       ├─────────── [글쓰기 버튼 클릭]
       │                │
       │                ▼
       │         ┌──────────────┐    인증 안 된 경우
       │         │ 인증 체크     │──────▶ ┌──────────┐
       │         └──────┬───────┘       │ 이메일    │
       │                │ 인증됨        │ 인증 모달 │
       │                ▼               └────┬─────┘
       │         ┌──────────────┐            │
       │         │ 글 작성 폼    │◀───────────┘
       │         │ - 카테고리     │
       │         │ - 본문        │
       │         │ - 익명 토글   │
       │         │ - 사진 (선택) │
       │         └──────┬───────┘
       │                │ [등록]
       │                ▼
       │         ┌──────────────┐
       │         │ 피드 새로고침  │
       │         │ (Optimistic  │
       │         │  UI 업데이트) │
       │         └──────────────┘
       │
       ├─────────── [게시글 클릭]
       │                │
       │                ▼
       │         ┌──────────────┐
       │         │ 상세 페이지    │
       │         │ - 본문 전문    │
       │         │ - 반응 토글   │
       │         │ - 댓글 목록   │
       │         │ - 댓글 작성   │
       │         └──────────────┘
       │
       └─────────── [카테고리/정렬/검색]
                        │
                        ▼
                  ┌──────────┐
                  │ 필터링된  │
                  │ 피드 표시 │
                  └──────────┘
```

### 3.3 페이지 라우팅 구조 (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx          # 로그인/이메일 인증
│   └── select/page.tsx         # 학과 3단계 선택
│
├── (main)/
│   ├── layout.tsx              # 네비게이션, 학과 셀렉터 포함
│   ├── page.tsx                # 학과 피드 (홈)
│   ├── post/
│   │   ├── new/page.tsx        # 글 작성
│   │   └── [id]/page.tsx       # 글 상세 + 댓글
│   ├── search/page.tsx         # 검색 결과
│   └── profile/page.tsx        # 내 프로필/내 글 목록
│
├── api/
│   └── ...                     # API Routes (필요시)
│
├── layout.tsx                  # Root Layout
└── globals.css
```

---

## 4. 기술 스택

### 4.1 전체 아키텍처

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client      │     │   Next.js    │     │  Supabase    │
│   (Browser)   │────▶│  (Vercel)    │────▶│  (Backend)   │
│               │     │              │     │              │
│ - React 19   │     │ - SSR/ISR    │     │ - Auth       │
│ - Tailwind   │     │ - API Routes │     │ - PostgreSQL │
│ - SWR        │     │ - Middleware │     │ - Storage    │
└──────────────┘     └──────────────┘     │ - Realtime   │
                                           └──────────────┘
```

### 4.2 기술 스택 상세

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **Framework** | Next.js | 15.x | App Router, SSR, Middleware |
| **Language** | TypeScript | 5.x | 전체 코드베이스 |
| **Styling** | Tailwind CSS | 4.x | 유틸리티 퍼스트 CSS |
| **Auth** | Supabase Auth | 최신 | 이메일/OTP 인증, RLS |
| **DB** | Supabase PostgreSQL | 최신 | 데이터 저장, full-text search |
| **Storage** | Supabase Storage | 최신 | 이미지 업로드 |
| **Realtime** | Supabase Realtime | 최신 | 반응/댓글 실시간 업데이트 (v1.1) |
| **Data Fetching** | SWR | 2.x | 클라이언트 사이드 캐싱 & 재검증 |
| **Hosting** | Vercel | - | 자동 배포, Edge Functions |
| **Package Manager** | pnpm | 9.x | 의존성 관리 |
| **형상관리** | GitHub | - | 소스 코드, PR 기반 워크플로우 |

### 4.3 Supabase 프로젝트 구성

```sql
-- ============================================
-- 1. departments 테이블
-- ============================================
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university  TEXT NOT NULL,          -- 대학교명
  college     TEXT NOT NULL,          -- 단과대명
  name        TEXT NOT NULL,          -- 학과명
  slug        TEXT UNIQUE NOT NULL,   -- URL 경로용 (예: hnu-business)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. profiles 테이블 (auth.users 확장)
-- ============================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        TEXT,               -- 커스텀 닉네임 (NULL이면 자동생성)
  department_id   UUID REFERENCES departments(id),
  batch_year      INT,               -- 입학년도 (예: 2023)
  is_anonymous_default BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. posts 테이블
-- ============================================
CREATE TABLE posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  category      TEXT NOT NULL CHECK (category IN (
    '수업후기', '교수님', '취업/인턴', '동아리', '인간관계', '자유'
  )),
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  batch_range   TEXT,                -- 예: '21학번', '19-20학번'
  is_anonymous  BOOLEAN DEFAULT true,
  is_pinned     BOOLEAN DEFAULT false,
  image_urls    TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ         -- soft delete
);

-- ============================================
-- 4. comments 테이블
-- ============================================
CREATE TABLE comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  parent_id     UUID REFERENCES comments(id),  -- 대댓글용
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_anonymous  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. reactions 테이블
-- ============================================
CREATE TABLE reactions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id),
  emoji     VARCHAR(4) NOT NULL CHECK (emoji IN ('❤️', '👍', '😢', '🎉')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ============================================
-- 6. 인덱스
-- ============================================
CREATE INDEX idx_posts_department    ON posts(department_id, created_at DESC);
CREATE INDEX idx_posts_category      ON posts(department_id, category);
CREATE INDEX idx_comments_post       ON comments(post_id, created_at);
CREATE INDEX idx_reactions_post      ON reactions(post_id);

-- Full-text search 인덱스
ALTER TABLE posts ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('korean', coalesce(content, '')), 'A')
  ) STORED;

CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

-- ============================================
-- 7. RLS (Row Level Security)
-- ============================================
ALTER TABLE posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;

-- 누구나 게시글 열람 가능 (삭제된 글 제외)
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (deleted_at IS NULL);

-- 해당 학과 소속만 글 작성 가능
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (
    department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
  );

-- 본인만 수정/삭제 가능
CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "posts_delete" ON posts
  FOR UPDATE USING (user_id = auth.uid());

-- 누구나 댓글 열람 가능
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (true);

-- 로그인한 사용자만 댓글 작성 가능
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 반응: 본인 것만 조회/삭제, 삽입은 로그인 시
CREATE POLICY "reactions_select" ON reactions
  FOR SELECT USING (true);

CREATE POLICY "reactions_insert" ON reactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "reactions_delete" ON reactions
  FOR DELETE USING (user_id = auth.uid());
```

### 4.4 핵심 API 호출 (클라이언트 → Supabase Direct)

> Next.js API Routes 없이 클라이언트에서 Supabase JS SDK로 직접 호출. RLS가 권한을 보장.

```typescript
// =============================================
// lib/supabase.ts — 클라이언트 Supabase 인스턴스
// =============================================
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// =============================================
// 피드 조회 (무한 스크롤)
// =============================================
async function getPosts(
  departmentId: string,
  category?: string,
  sort: 'latest' | 'reactions' | 'comments' = 'latest',
  page: number = 0,
  pageSize: number = 20
) {
  const supabase = createClient()
  
  let query = supabase
    .from('posts')
    .select(`
      id, category, content, batch_range, is_anonymous,
      image_urls, created_at, is_pinned,
      profiles:user_id (nickname, batch_year, department_id)
    `)
    .eq('department_id', departmentId)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
  
  if (category && category !== '전체') {
    query = query.eq('category', category)
  }
  
  if (sort === 'latest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'reactions') {
    // reactions 집계를 위해 별도 쿼리 또는 뷰 필요
    // v1에서는 latest만 지원, v1.1에서 reactions/comments 정렬 추가
    query = query.order('created_at', { ascending: false })
  }
  
  return query
    .range(page * pageSize, (page + 1) * pageSize - 1)
}

// =============================================
// 글 작성
// =============================================
async function createPost(data: {
  department_id: string
  category: string
  content: string
  is_anonymous: boolean
  batch_range?: string
  image_urls?: string[]
}) {
  const supabase = createClient()
  return supabase.from('posts').insert(data).select().single()
}

// =============================================
// 반응 토글
// =============================================
async function toggleReaction(postId: string, emoji: string) {
  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  
  // 기존 반응 확인
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, emoji')
    .eq('post_id', postId)
    .eq('user_id', user.data.user!.id)
    .maybeSingle()
  
  if (existing) {
    if (existing.emoji === emoji) {
      // 같은 이모지 → 삭제
      return supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      // 다른 이모지 → 업데이트
      return supabase.from('reactions')
        .update({ emoji })
        .eq('id', existing.id)
    }
  } else {
    // 새 반응 생성
    return supabase.from('reactions')
      .insert({ post_id: postId, user_id: user.data.user!.id, emoji })
  }
}

// =============================================
// 이미지 업로드
// =============================================
async function uploadImage(file: File) {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${ext}`
  
  const { data, error } = await supabase.storage
    .from('post-images')
    .upload(fileName, file, { contentType: file.type, upsert: false })
  
  if (error) throw error
  
  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(fileName)
  
  return publicUrl
}
```

### 4.5 Vercel 배포 설정

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
```

### 4.6 환경 변수 체크리스트

```bash
# .env.local (개발용 — 커밋 금지)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Vercel 환경 변수 설정 필수
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 5. MVP 범위 (v1.0)

| 포함 | 제외 (v1.1+) |
|------|-------------|
| 학과 선택 및 이메일 인증 | 실시간 알림 (Realtime) |
| 글 작성 / 수정 / soft 삭제 | 푸시 알림 |
| 댓글 / 대댓글 | 반응순/댓글순 정렬 |
| 반응 토글 (4종) | 관리자 대시보드 |
| 카테고리 필터 + 최신순 정렬 | 신고 / 차단 기능 |
| 무한 스크롤 피드 | 다크 모드 |
| 사진 첨부 (P1 → MVP에 포함) | 학과별 통계 |
| 반응순/댓글순 정렬은 v1.0 포함 | |

---

## 6. 일정 (가이드)

| 주차 | 내용 |
|------|------|
| 1주 | Supabase 프로젝트 생성, DB 마이그레이션, 인증 연동 |
| 2주 | 학과 선택 UX, 피드 페이지 (목록 + 무한스크롤) |
| 3주 | 글 작성/상세, 댓글 CRUD, 반응 토글 |
| 4주 | 이미지 업로드, 검색, 필터/정렬, QA 및 배포 |

---
