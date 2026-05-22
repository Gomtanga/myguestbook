-- ============================================
-- 기존 테이블 초기화 (재실행 시 오류 방지)
-- ⚠️ 데이터가 모두 삭제됩니다
-- ============================================
DROP TABLE IF EXISTS reactions  CASCADE;
DROP TABLE IF EXISTS comments   CASCADE;
DROP TABLE IF EXISTS posts      CASCADE;
DROP TABLE IF EXISTS profiles   CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ============================================
-- 1. departments 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
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
CREATE TABLE IF NOT EXISTS profiles (
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
CREATE TABLE IF NOT EXISTS posts (
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
  deleted_at    TIMESTAMPTZ,         -- soft delete
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(content, '')), 'A')
  ) STORED
);

-- ============================================
-- 4. comments 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
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
CREATE TABLE IF NOT EXISTS reactions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id),
  emoji     TEXT NOT NULL CHECK (emoji IN ('❤️', '👍', '😢', '🎉')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ============================================
-- 6. 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_department ON posts(department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category   ON posts(department_id, category);
CREATE INDEX IF NOT EXISTS idx_comments_post    ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_post   ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_search     ON posts USING GIN(search_vector);

-- ============================================
-- 7. RLS (Row Level Security)
-- ============================================
ALTER TABLE posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "posts_select"   ON posts;
DROP POLICY IF EXISTS "posts_insert"   ON posts;
DROP POLICY IF EXISTS "posts_update"   ON posts;
DROP POLICY IF EXISTS "posts_delete"   ON posts;
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "reactions_select" ON reactions;
DROP POLICY IF EXISTS "reactions_insert" ON reactions;
DROP POLICY IF EXISTS "reactions_delete" ON reactions;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- 누구나 게시글 열람 가능 (삭제된 글 제외)
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (deleted_at IS NULL);

-- 해당 학과 소속만 글 작성 가능
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (
    department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
  );

-- 본인만 수정 가능
CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (user_id = auth.uid());

-- 본인만 삭제 가능 (soft delete)
CREATE POLICY "posts_delete" ON posts
  FOR UPDATE USING (user_id = auth.uid());

-- 누구나 댓글 열람 가능
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (true);

-- 로그인한 사용자만 댓글 작성 가능
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 반응 정책
CREATE POLICY "reactions_select" ON reactions
  FOR SELECT USING (true);

CREATE POLICY "reactions_insert" ON reactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "reactions_delete" ON reactions
  FOR DELETE USING (user_id = auth.uid());

-- 프로필 정책
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 8. 샘플 데이터 (선택 사항)
-- ============================================
INSERT INTO departments (university, college, name, slug) VALUES
  ('한남대학교', '경상대학', '경영학과', 'hnu-business'),
  ('한남대학교', '경상대학', '경제학과', 'hnu-economics'),
  ('한남대학교', '공과대학', '컴퓨터공학과', 'hnu-cse')
ON CONFLICT (slug) DO NOTHING;
