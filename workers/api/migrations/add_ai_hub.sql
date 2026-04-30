-- AI Hub: stage-aware solution library + GitHub skill knowledge base
--
-- The hub stores community-submitted "solutions" (tools, gems, prompts, skills, workflows)
-- tagged by sales stage, plus a separate index of Cloudflare GitHub skills used to ground
-- the AI chat. Vectors for both live in the existing VECTORIZE index with a `kind` filter
-- to keep them isolated from RFx documentation chunks.

-- ──────────────────────────────────────────────────────────────────────────────
-- Solution library (matches the cards shown in the AI Hub UI)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_solutions (
  id TEXT PRIMARY KEY,
  -- 'tool' | 'gem' | 'prompt' | 'skill' | 'workflow' | 'agent'
  type TEXT NOT NULL DEFAULT 'prompt',
  title TEXT NOT NULL,
  description TEXT,
  -- Long-form content: the actual prompt text, workflow steps, skill summary, etc.
  content TEXT NOT NULL,
  -- 'all' | 'running-business' | 'account-planning' | 'qualification' | 'solution-design' | 'negotiation' | 'renewals'
  sales_stage TEXT NOT NULL DEFAULT 'all',
  -- Optional product the solution is most relevant to (Workers, Zero Trust, etc.)
  product TEXT,
  tags TEXT, -- JSON array
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  -- 1 = curated starter-pack item, 0 = community contribution
  is_starter INTEGER NOT NULL DEFAULT 0,
  -- 1 = pinned by an admin to the top of its stage
  is_pinned INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  source_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_solutions_stage ON ai_solutions(sales_stage);
CREATE INDEX IF NOT EXISTS idx_ai_solutions_type ON ai_solutions(type);
CREATE INDEX IF NOT EXISTS idx_ai_solutions_starter ON ai_solutions(is_starter);
CREATE INDEX IF NOT EXISTS idx_ai_solutions_upvotes ON ai_solutions(upvotes);

CREATE TABLE IF NOT EXISTS ai_solution_upvotes (
  id TEXT PRIMARY KEY,
  solution_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(solution_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_ai_solution_upvotes_solution ON ai_solution_upvotes(solution_id);

-- Track when a solution is opened/copied so we can show "uses" and discover hot ones
CREATE TABLE IF NOT EXISTS ai_solution_uses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solution_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  -- 'view' | 'copy' | 'apply' (sent to chat)
  action TEXT NOT NULL DEFAULT 'view',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_solution_uses_solution ON ai_solution_uses(solution_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- Cloudflare GitHub skills (knowledge source for the AI chat)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cf_skills (
  id TEXT PRIMARY KEY, -- slug, e.g. "workers-best-practices"
  name TEXT NOT NULL,
  description TEXT, -- pulled from the SKILL.md frontmatter
  content TEXT, -- full markdown content
  source_url TEXT NOT NULL, -- GitHub raw URL
  github_repo TEXT NOT NULL DEFAULT 'cloudflare/skills',
  github_branch TEXT NOT NULL DEFAULT 'main',
  github_path TEXT, -- e.g. "skills/workers-best-practices/SKILL.md"
  chunks_count INTEGER DEFAULT 0,
  byte_size INTEGER DEFAULT 0,
  -- 'pending' | 'indexing' | 'indexed' | 'failed'
  status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  last_indexed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_skills_status ON cf_skills(status);

-- One row per chunk that lives in VECTORIZE. Mirrors the doc_vectors pattern.
CREATE TABLE IF NOT EXISTS cf_skill_vectors (
  id TEXT PRIMARY KEY, -- matches the vector id in the VECTORIZE index
  skill_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  byte_size INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_skill_vectors_skill ON cf_skill_vectors(skill_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- AI chat history (lightweight; one row per turn)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- A client-generated id used to group turns into a single conversation
  session_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  sales_stage TEXT, -- snapshot of the stage chosen for this turn
  -- JSON array of citation objects the assistant referenced (skill name, snippet, score)
  citations TEXT,
  -- JSON array of solution ids the user attached as context
  context_solution_ids TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_session ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_ai_chat_created ON ai_chat_messages(created_at);
