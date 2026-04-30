-- ────────────────────────────────────────────────────────────────────────────
-- SE Messaging Playbooks — curated artifacts for the new inline section on /ai-hub
--
-- Each artifact is an `ai_solution` row with:
--   - is_starter = 1    (shows in the Starter Pack accordion as a fallback view)
--   - is_pinned = 1     (sorts to the top within its stage)
--   - tags       = JSON array containing both "playbook" and a kind tag
--                  ("playbook:value-prop" | "playbook:discovery" |
--                   "playbook:objection"  | "playbook:email"     |
--                   "playbook:talk-track" | "playbook:close")
--
-- The inline Messaging Playbooks section on the AI Hub filters by the
-- "playbook" tag and groups by the kind tag.
--
-- Run with:
--   wrangler d1 execute seportal-db --remote --file=migrations/seed_se_messaging_playbooks.sql
-- ────────────────────────────────────────────────────────────────────────────

-- Make this re-runnable: clear out any prior seeded playbook artifacts first.
DELETE FROM ai_solution_upvotes WHERE solution_id LIKE 'pb-%';
DELETE FROM ai_solution_uses    WHERE solution_id LIKE 'pb-%';
DELETE FROM ai_solutions        WHERE id          LIKE 'pb-%';

-- ────────────────────────────────────────────────────────────────────────────
-- STAGE: Running Your Business
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO ai_solutions (id, type, title, description, content, sales_stage, product, tags, author_email, author_name, is_starter, is_pinned, icon, source_url) VALUES
('pb-rb-prep', 'gem', 'Pre-meeting prep brief',
 'A 5-minute prep brief generator: company snapshot, attendees, recent signals, suggested agenda.',
 '# Pre-meeting Prep Brief

## Inputs you provide
- Customer name, account tier, region
- Who is on the call (titles + roles)
- Last 3 touchpoints (date + summary)

## Output you get
1. **Company snapshot** — Industry, employees, public/private, recent earnings or funding signal.
2. **Cloudflare footprint** — Active products, current spend, top 3 usage trends from the last 30 days.
3. **Attendee intel** — For each attendee: title, likely incentives, and a 1-line "why they care".
4. **Recent signals** — News, hiring patterns, security incidents, competitive announcements.
5. **Suggested 30-min agenda** — Open / discovery / value moments / next step.
6. **One sharp question** to lead with that proves you did your homework.

> Ground every assertion in a source. If you cannot cite it, drop it.',
 'running-business', NULL,
 '["playbook","playbook:talk-track","prep","meeting"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '📝', 'https://github.com/cloudflare/skills'),

('pb-rb-followup', 'gem', 'Follow-up email after a technical deep dive',
 'Crisp post-meeting email that reinforces value, captures action items, and keeps momentum.',
 'Subject: {{Customer}} × Cloudflare — recap + next steps

Hi {{Name}},

Thanks for the deep dive today. To make sure we all left aligned, here is what I heard, what we agreed, and what I will own.

**What I heard**
- {{Top business pain in their words}}
- {{Technical constraint they flagged}}
- {{Stakeholder or timing context that matters}}

**What we explored**
- {{Cloudflare capability 1}} → addresses {{pain}}
- {{Cloudflare capability 2}} → addresses {{constraint}}
- {{Open architectural question we still need to validate}}

**Agreed next steps**
| Owner | Action | Date |
|-------|--------|------|
| {{Customer}} | {{Action}} | {{Date}} |
| Cloudflare | {{Action}} | {{Date}} |

If anything above is off, please correct me — accuracy matters more than speed.

Best,
{{SE name}}',
 'running-business', NULL,
 '["playbook","playbook:email","follow-up"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '✉️', 'https://github.com/cloudflare/skills'),

('pb-rb-status', 'gem', 'Internal weekly deal update',
 'A 6-line internal status update so AE/leadership can scan in <30 seconds.',
 '**{{Account}} — {{$Stage}} — {{$Amount}}**

- **What changed this week:** {{1-line update}}
- **Why we will win:** {{Differentiation}} + {{Champion}}
- **What could derail us:** {{Risk}} → mitigation: {{Owner}} by {{Date}}
- **What I need:** {{Specific ask: exec call, technical resource, pricing approval, etc.}}
- **Next milestone:** {{Event}} on {{Date}}
- **Confidence:** {{Commit / Best Case / Pipeline}} ({{%}})',
 'running-business', NULL,
 '["playbook","playbook:talk-track","status","internal"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '📊', 'https://github.com/cloudflare/skills');

-- ────────────────────────────────────────────────────────────────────────────
-- STAGE: Account Planning & Prospecting
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO ai_solutions (id, type, title, description, content, sales_stage, product, tags, author_email, author_name, is_starter, is_pinned, icon, source_url) VALUES
('pb-ap-pov', 'gem', 'Account POV: Why now, why Cloudflare',
 'A 1-page point-of-view template SEs use to start an account plan with conviction.',
 '# {{Customer}} — Why Now, Why Cloudflare

## 1. Their world today (what we observe)
- Business model + how they make money
- Top 3 strategic priorities (from earnings call, hiring, public roadmap)
- Their current tech footprint that matters to us (CDN, WAF, ZTNA, identity, network edge)

## 2. The pain we believe they are feeling
- {{Hypothesis 1}} — evidence: {{Source}}
- {{Hypothesis 2}} — evidence: {{Source}}
- {{Hypothesis 3}} — evidence: {{Source}}

## 3. Cloudflare’s point of view
The connectivity cloud is how every modern enterprise will consolidate the messy stack of point products that currently sit between users, apps, networks, and the internet. We replace 5–8 vendors with one programmable platform running across 335+ points of presence.

## 4. The 3 plays we believe will land
1. **{{Play name}}** — {{1-line outcome}} (lead product: {{Product}})
2. **{{Play name}}** — {{1-line outcome}} (lead product: {{Product}})
3. **{{Play name}}** — {{1-line outcome}} (lead product: {{Product}})

## 5. The first meeting we want
- Audience: {{Title}} + {{Title}}
- Hook: {{1-line angle}}
- Outcome: {{1 specific commitment we want to leave with}}',
 'account-planning', NULL,
 '["playbook","playbook:talk-track","account-plan","pov"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🎯', 'https://github.com/cloudflare/skills'),

('pb-ap-outreach', 'gem', 'Cold outreach email — exec opener',
 'Personalised outreach that earns a reply by leading with their context, not our pitch.',
 'Subject: {{Public signal}} → a 15-min idea for {{Company}}

Hi {{Name}},

I noticed {{specific public signal — earnings comment, hiring spree, recent breach, product launch, exec quote}}. That maps to a pattern we are seeing with {{2-3 peer companies in their industry}}: {{the underlying problem in plain English}}.

Cloudflare quietly sits in front of {{X% of public web / Y% of S&P 500 / their top 3 competitors}} and we have helped teams like {{Reference customer}} get to {{specific measurable outcome}} in {{timeframe}}.

I am not asking for a sales meeting. I am asking for 15 minutes to share one slide that reframes {{the problem}} for {{Title}} audiences. If that is useful, we keep going. If not, you have a slide.

Worth 15 min next Tuesday or Thursday?

{{SE name}}
{{Phone}} • {{Calendar link}}',
 'account-planning', NULL,
 '["playbook","playbook:email","prospecting","cold-outreach"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '📧', 'https://github.com/cloudflare/skills'),

('pb-ap-stakeholder', 'gem', 'Stakeholder map — 5 questions to fill it in',
 'Five surgical questions that surface power, influence, and competing agendas in 10 minutes.',
 '# Stakeholder Map: 5 Questions to Ask Your Champion

1. **Decision authority** — "Who needs to say yes for {{the project}} to actually start? Who needs to say yes for it to clear procurement?"

2. **Power vs. title** — "Beyond the org chart, who tends to set direction in the room when you debate vendors?"

3. **Counter-coalition** — "Who internally is most likely to push back on this — and what is their alternative?"

4. **Budget sourcing** — "Is this funded out of {{Function}}''s existing budget, or does {{Finance}} need to allocate? When is the next budget gate?"

5. **The unwritten goal** — "If this project goes well, whose career visibly improves? If it stalls, whose problem does it become?"

Map answers as: **Decision-maker | Influencer | User | Blocker | Sponsor** for each named person. Refresh every two weeks.',
 'account-planning', NULL,
 '["playbook","playbook:discovery","stakeholders","meddpicc"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🗺️', 'https://github.com/cloudflare/skills');

-- ────────────────────────────────────────────────────────────────────────────
-- STAGE: Qualification & Discovery
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO ai_solutions (id, type, title, description, content, sales_stage, product, tags, author_email, author_name, is_starter, is_pinned, icon, source_url) VALUES
('pb-qd-meddpicc', 'gem', 'MEDDPICC discovery framework — 12 questions',
 'A tight set of MEDDPICC questions tuned for Cloudflare deals across Application, Network, and Zero Trust portfolios.',
 '# MEDDPICC Discovery — 12 Questions That Actually Qualify

**Metrics**
1. "What metric will leadership use to know this project worked? What is it today, and what does ‘good’ look like?"
2. "What does an extra hour of {{security incident triage / page latency / VPN session / origin egress}} cost you in real dollars?"

**Economic buyer**
3. "Who signs off on a {{>$X}} security/network platform spend, and what does their last 90 days of priorities look like?"

**Decision criteria**
4. "If you were grading vendors on a scorecard, what are the 5 weighted criteria? Where does Cloudflare sit on each today?"

**Decision process**
5. "Walk me through the path from ‘we like this’ to ‘PO signed.’ What are the named gates and review boards?"

**Paper process**
6. "Who runs procurement for security/networking? Have they bought from Cloudflare before, or is this a first-time vendor onboarding?"

**Identify pain**
7. "When this problem flares up, who is the first person texted at 11 p.m. and what does that text usually say?"
8. "What changes in the next 6 months that makes this pain bigger if you do nothing?"

**Champion**
9. "If we move forward, who internally is most invested in making it succeed? What is their incentive?"
10. "Who is going to defend this internally when {{Procurement / IT Architecture Review / SecOps}} pushes back?"

**Competition**
11. "Who else are you evaluating, and which one of them is currently in the lead — and why?"

**Compelling event**
12. "If we don''t solve this by {{date}}, what specifically breaks?"',
 'qualification', NULL,
 '["playbook","playbook:discovery","meddpicc","qualification"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🔍', 'https://github.com/cloudflare/skills'),

('pb-qd-value-statement', 'gem', 'Cloudflare connectivity cloud value statement',
 'The 30-second exec value statement, plus 60-second and 3-minute variants.',
 '# Cloudflare Value Statement — 3 lengths

## 30 seconds (elevator)
"Every company is now an internet company. The bigger you get, the more vendors sit between your users and your apps — CDNs, WAFs, VPNs, ZTNA, DDoS, DNS, identity, observability. Cloudflare is the connectivity cloud: one programmable platform across 335+ points of presence that replaces that stack with native, integrated services. Same platform that protects 20% of the public web. Customers consolidate 5–8 vendors and cut latency, attack surface, and cost in the same move."

## 60 seconds (technical decision-maker)
Lead with the architectural why:
- The problem: every connection between users, apps, networks, and the internet now passes through a stack of point products that rarely talk to each other.
- The proof: we operate the network that already runs DNS for {{>80M domains}}, sits in front of {{20%+ of public web traffic}}, and stops {{>200B daily threats}}.
- The differentiator: every service runs in every PoP, written on the same workers runtime, so policy is consistent, latency is measured in single-digit ms, and you do not pay an integration tax to bolt these together.
- The "so what": consolidate vendors, simplify policy, and run apps closer to users than any centralized cloud can.

## 3 minutes (board / CFO)
Use the **trend → tension → opportunity** structure:
1. **Trend** — Hybrid work, AI workloads, and API-first apps are pushing more business value to the network edge. Centralized cloud and legacy hardware vendors cannot scale to meet that.
2. **Tension** — Security teams are stuck buying point products; network teams are forklifting MPLS to SD-WAN to SASE; app teams want speed. Each motion is funded separately and rarely connects.
3. **Opportunity** — Cloudflare collapses these into one programmable platform, sold per seat or per request, with no MPLS commit and no hardware. The customers who consolidate first get a 12–18 month TCO and agility advantage.

End on one line: **"We have done this for {{>40% of Fortune 1000}}. We can show you what {{your peer}} did in 90 days."**',
 'qualification', NULL,
 '["playbook","playbook:value-prop","positioning","exec"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '💎', 'https://github.com/cloudflare/skills'),

('pb-qd-pain', 'gem', 'Pain framing matrix — turn symptoms into value',
 'A reusable matrix that maps observed customer symptoms to a Cloudflare capability and a quantified business value.',
 '# Pain Framing Matrix

| Symptom they describe | Underlying business pain | Cloudflare capability | Value lever |
|-----------------------|--------------------------|-----------------------|-------------|
| "Our CDN bills are unpredictable" | Egress is uncapped + no per-request visibility | Workers + Cache Reserve + Bandwidth Alliance | 30–60% egress reduction |
| "We get DDoSed every quarter" | Mitigation is reactive + capacity is centralized | Magic Transit + L7 DDoS protection | Always-on Tbps mitigation, no scrubbing detours |
| "VPN is slow and users complain" | Hub-and-spoke, no app-level posture, hairpinning | Cloudflare Access + WARP + Gateway | Sub-50ms app access, posture-aware, no tunnels |
| "We have 7 security vendors" | Tool sprawl drives MTTD/MTTR up + integration tax | One Dashboard + unified policy + SSE/SASE | 5–8 vendor consolidation |
| "Our origin keeps getting probed" | No tunnel, public IP exposed, ACLs are stale | Cloudflare Tunnel + Zero Trust origin | Origin disappears from the public internet |
| "Bot traffic is killing inventory" | Generic WAF, no behavioral signal | Bot Management + Turnstile | 90%+ malicious bot reduction without CAPTCHAs |
| "AI is using too much of our infra" | Inferencing at central cloud, expensive eject + slow | Workers AI + AI Gateway + Vectorize | <100ms inference at edge, prompt caching, observability |

## How to use this in discovery
1. When the customer says a **symptom**, repeat it back in **business pain** language.
2. Before naming the **capability**, ask one validation question: *"How are you measuring that today?"*
3. Always anchor the **value lever** in their numbers, not ours.',
 'qualification', NULL,
 '["playbook","playbook:talk-track","pain","value-mapping"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🧭', 'https://github.com/cloudflare/skills'),

('pb-qd-objection-already-have', 'gem', 'Objection: "We already have {{Akamai|Cloudflare|Zscaler|Netskope}}"',
 'A 4-step response framework for the most common displacement objection in qualification.',
 '# Objection: "We already have {{Vendor X}}"

## Step 1 — Validate, do not argue
"Got it — and given the investment you have made, you should expect a clear reason to do anything different. Can I ask three quick questions before I pitch anything?"

## Step 2 — Ask the disqualifying questions (pick 3)
- "Across {{Vendor X}}, how many separate consoles does your team operate, and which person owns end-to-end policy?"
- "What was the last time their roadmap shipped a capability you needed in <90 days?"
- "How does your renewal pricing trend year over year — flat, up, or down?"
- "When you compare incidents YoY, is your MTTD getting faster or slower?"
- "How much of your traffic actually rides {{Vendor X}}''s network vs. coming back to your origin?"

## Step 3 — Reframe the conversation
"You may not need to rip and replace anything. Most of our largest accounts started by putting Cloudflare in front of one critical workload — {{a public API, a Workday-style SaaS app, a developer-facing portal}} — and let the data speak. We do not need to win the platform argument today. We need to earn one workload, and you measure the delta."

## Step 4 — Make the next step trivially small
"How about this: I send you a 1-page architectural diff for {{specific workload}} this week. If the diff is real, you give me 30 minutes with {{decision-maker}} next week. If it is not, no harm done."',
 'qualification', NULL,
 '["playbook","playbook:objection","competitive","displacement"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🛡️', 'https://github.com/cloudflare/skills'),

('pb-qd-demo-opener', 'gem', 'First demo: 90-second opener',
 'The first 90 seconds of a discovery demo — sets the frame so the demo is about them, not us.',
 '# 90-Second Demo Opener

> "Before I share my screen, I want to set expectations. The next 30 minutes are not a Cloudflare product tour. I want to do three things:

1. **Reflect** what I have heard about {{their problem}} so far, and check I have it right.
2. **Show** the smallest possible part of Cloudflare that maps to {{their pain}}, no slides.
3. **Stop** every 5 minutes to ask whether this is solving for what you actually need, or whether we should pivot.

I will resist the urge to show you everything Cloudflare can do — there is plenty of time for that if you want it. Today is about {{their pain}}. Sound okay?"

(Wait for the explicit yes.)

> "Great. Real quick — was there anyone you wished was on this call? I would rather we agree now whether to invite them next time than realise it after the fact."',
 'qualification', NULL,
 '["playbook","playbook:talk-track","demo","opening"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🎬', 'https://github.com/cloudflare/skills');

-- ────────────────────────────────────────────────────────────────────────────
-- STAGE: Solution Design & Proposal
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO ai_solutions (id, type, title, description, content, sales_stage, product, tags, author_email, author_name, is_starter, is_pinned, icon, source_url) VALUES
('pb-sd-narrative', 'gem', '1-page solution narrative',
 'A repeatable 1-page solution story SEs send before a deep dive, so stakeholders walk in aligned.',
 '# Solution Narrative — {{Customer}} × Cloudflare

## The challenge (in their words)
{{One paragraph that any exec at the customer would read and say "yes, that is us." Use their nouns, not ours.}}

## What we propose
Cloudflare will deliver {{specific outcome}} by combining {{Capability A}}, {{Capability B}}, and {{Capability C}} on our connectivity cloud — running across 335+ points of presence so policy and performance are consistent for every user.

## How it works (3 sentences max)
1. {{User / app traffic hits Cloudflare first}}
2. {{We apply security + perf policy at the closest PoP}}
3. {{We hand the cleaned, accelerated traffic to your origin / SaaS / cloud, in any combination}}

## Why this beats {{incumbent}}
- **Architecture**: {{1-line diff that matters technically}}
- **Speed of change**: {{1-line diff that matters operationally}}
- **Total cost**: {{1-line diff that matters to the CFO}}

## What we expect to be true 12 months from now
- {{Concrete capability in production}}
- {{Quantified metric improvement}}
- {{One business-level story the exec sponsor can tell their CEO}}

## What we need from {{Customer}} to start
- {{Named technical owner}}
- {{Named business sponsor}}
- {{2-week mutual milestone date}}

> If anything in this narrative does not feel true, tell me before we present. We will rewrite it together.',
 'solution-design', NULL,
 '["playbook","playbook:talk-track","narrative","proposal"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '📐', 'https://github.com/cloudflare/skills'),

('pb-sd-arch-vs', 'gem', 'Architecture diff: Cloudflare vs. {{Akamai|Zscaler|F5|Imperva}}',
 'A reusable architecture comparison that frames the discussion as one network vs. multiple stacks.',
 '# Architecture Diff: Cloudflare vs. {{Incumbent}}

## Frame the comparison this way
> "There is no fair way to compare any individual product. The right comparison is: **one programmable network that runs every service in every PoP** vs. **a stack of services chained together by integration**."

## Three architectural questions you can ask in any deal
1. **Where does your policy run?** — Cloudflare: every PoP. {{Incumbent}}: scrubbing centers, regional zones, or central console + agents.
2. **Where does your code run?** — Cloudflare: every PoP, in <50ms cold start, with KV / D1 / Vectorize beside it. {{Incumbent}}: lambdas at central cloud, agents on the device, or "we don''t do code".
3. **How do services share state?** — Cloudflare: same control plane, same identity graph, same observability. {{Incumbent}}: separate consoles, separate billing, separate APIs.

## What changes operationally
| Operation | Cloudflare | {{Incumbent}} |
|-----------|------------|---------------|
| New WAF rule rolled out | <60s globally | 5–30 minutes per zone |
| New ZTNA policy | Same console as WAF + DNS | Different product, different console |
| New origin | Cloudflare Tunnel = 0 firewall changes | New ACL entries, new IPs to whitelist |
| Add a region | Already there | Buy more capacity / nodes |

> Anchor the diff in the customer''s observable pain. If they have not said the words "tool sprawl," "console fatigue," or "slow to ship policy," do not lead with this comparison.',
 'solution-design', NULL,
 '["playbook","playbook:talk-track","competitive","architecture"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🏗️', 'https://github.com/cloudflare/skills'),

('pb-sd-mutual-plan', 'gem', 'Mutual close plan template',
 'A working artifact you co-build with the champion. Forces clarity on dates, owners, and exit criteria.',
 '# {{Customer}} × Cloudflare — Mutual Close Plan

**Goal**: {{1-sentence outcome the customer wants in production}}
**Decision date**: {{Date the customer needs to commit}}
**Compelling event**: {{What breaks if we miss this date}}

## Workstreams

### 1. Technical validation
| Step | Owner | Date | Done = |
|------|-------|------|--------|
| Architecture walkthrough | {{SE}} + {{Customer Architect}} | {{Date}} | Signed-off diagram |
| Proof of value scope | {{Customer}} + {{SE}} | {{Date}} | 1-page success criteria |
| POV execution | {{SE Team}} | {{Date}} | Pass/fail report |

### 2. Business case
| Step | Owner | Date | Done = |
|------|-------|------|--------|
| Pain $-quantified | {{Champion}} + {{Cloudflare}} | {{Date}} | Numbers in CRM |
| ROI / TCO model | {{Cloudflare}} | {{Date}} | Reviewed by {{CFO/Procurement}} |
| Reference call | {{AE}} | {{Date}} | Customer-to-customer call done |

### 3. Procurement & legal
| Step | Owner | Date | Done = |
|------|-------|------|--------|
| MSA review | {{Customer Legal}} | {{Date}} | Redlines back |
| Vendor onboarding | {{Customer Procurement}} | {{Date}} | Vendor record approved |
| InfoSec review | {{Customer SecOps}} | {{Date}} | Cleared |

### 4. Executive alignment
| Step | Owner | Date | Done = |
|------|-------|------|--------|
| Exec briefing | {{Customer Sponsor}} | {{Date}} | Sponsor + EB on call |
| Final approval | {{Economic Buyer}} | {{Date}} | Verbal commit |

## Risks we are tracking
- {{Risk}} → mitigation: {{Owner}} by {{Date}}
- {{Risk}} → mitigation: {{Owner}} by {{Date}}

> This is a working document. Update weekly with the champion. If a date slips, we update before the date — never after.',
 'solution-design', NULL,
 '["playbook","playbook:talk-track","mutual-plan","close-plan"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🤝', 'https://github.com/cloudflare/skills'),

('pb-sd-pov-email', 'gem', 'Email: proposing a Proof of Value',
 'Frames a POV as a small, scoped, time-boxed engineering exercise — not a bake-off.',
 'Subject: Proposed POV: {{1-line outcome}} for {{Customer}}

Hi {{Name}},

After our last conversation, here is what I think the cleanest way forward looks like.

**What we would prove in this POV**
1. {{Specific technical claim — e.g. "ZTNA can replace your VPN for the Workday user population"}}
2. {{Specific operational claim — e.g. "Policy changes propagate in <60s globally"}}
3. {{Specific economic claim — e.g. "Egress on {{workload}} drops by ≥30%"}}

**Scope (bounded)**
- {{1 production-adjacent workload}}
- {{N users / N requests / N domains}}
- {{Geography or business unit}}

**Timeline**
- Week 1: design + setup
- Week 2-3: live traffic, telemetry collection
- Week 4: report-out + decision

**What we need from {{Customer}}**
- {{1 named technical owner}}
- {{1 named business owner}}
- {{Read-only access to {{system}}}}

**What you get either way**
- A stamped report we both sign that says "this worked / did not work, here is the data."
- No sunk cost, no licensing commitment to keep going.

If this scope and timing works, I will send a 1-page POV agreement we can both sign in the next 24 hours.

{{SE name}}',
 'solution-design', NULL,
 '["playbook","playbook:email","pov","proposal"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🧪', 'https://github.com/cloudflare/skills');

-- ────────────────────────────────────────────────────────────────────────────
-- STAGE: Negotiation & Close
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO ai_solutions (id, type, title, description, content, sales_stage, product, tags, author_email, author_name, is_starter, is_pinned, icon, source_url) VALUES
('pb-nc-discount', 'gem', 'Objection: "We need a 20%+ discount"',
 'A response framework that defends value without losing the deal.',
 '# Objection: "We need a 20%+ discount"

## Step 1 — Slow down, do not concede
"I hear you. Before we negotiate the number, can we make sure we are negotiating the same scope? Discounting against the wrong scope wastes both our time."

## Step 2 — Reframe to value, not price
- "If we hold scope flat, what would you need to see in return for the price you are quoting?"
- "If we held the price flat, what could we adjust on scope or term to make the same total work?"

## Step 3 — Trade only with reciprocity
Three things you can give, and what you ask in return:

| You give | You ask |
|----------|---------|
| Multi-year price lock | 3-year commit + auto-renew |
| Ramp / step pricing | Larger Year-1 commit floor |
| Additional product at marginal price | Reference-ability + case study |
| Net-new product credit | Public logo + named exec quote |

## Step 4 — When you must hold
- "I want to be honest with you: this number is at the floor I can defend internally without going to deal desk for a special. I can absolutely take it there, but I will need to pair it with one thing that helps me defend it."

## Step 5 — Always ask the disarming question
"If we landed at {{number}}, are we signed? Or is there another approval still in front of us?"',
 'negotiation', NULL,
 '["playbook","playbook:objection","pricing","negotiation"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '💼', 'https://github.com/cloudflare/skills'),

('pb-nc-roi', 'gem', 'ROI / TCO re-affirmation script',
 'A 60-second talk track to re-anchor the deal in business value before procurement starts grinding.',
 '# ROI Re-Affirmation Talk Track

> "Before procurement gets in the room, I want to spend 60 seconds making sure we still agree on the prize.

We started this conversation around {{specific pain}}. The number we landed on for that pain was **${{X}} per year** in {{lost revenue / wasted spend / risk exposure}}.

What we are proposing brings that number to roughly **${{Y}}**, in {{timeframe}}, by {{specific mechanism — eg. consolidating 4 vendors, eliminating egress, replacing VPN}}.

The investment we are talking about is **${{Z}}** annually.

So the question on the table is not really ‘what is the discount’ — it is whether **${{X − Y}} of recovered value** is worth **${{Z}}**. Today, with everything you have shared, my answer is yes. Is yours?"

(Wait. Listen. Then go back to the spreadsheet only after they have re-anchored on the value number.)',
 'negotiation', NULL,
 '["playbook","playbook:talk-track","roi","value-defense"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '📈', 'https://github.com/cloudflare/skills'),

('pb-nc-procurement', 'gem', 'Email to procurement — make their job easier',
 'A short, structured email that procurement actually reads — and which speeds the paper process.',
 'Subject: {{Customer}} × Cloudflare — info pack for procurement

Hi {{Procurement Name}},

I want to make this easy for you. Below is everything you typically ask for, in one place.

**1. Vendor record / standard forms**
- W-9, banking, SOC 2 Type II, ISO 27001, PCI DSS Level 1, GDPR, FedRAMP-{{level}} — link: {{Cloudflare Trust Hub}}
- DPA, SCC, BAA — link: {{Cloudflare legal portal}}

**2. Commercial summary**
- Term: {{N years}}, starting {{Date}}
- Year-1 ARR: ${{X}}
- Total Contract Value: ${{Y}}
- Payment terms: {{Net-30 / Net-60}}, billed annually in advance

**3. Negotiated MSA / order form**
- {{Link to redlined MSA}} (last redline returned {{Date}})
- {{Link to current order form}}

**4. Open items**
| Item | Owner | Target |
|------|-------|--------|
| {{Item}} | {{Name}} | {{Date}} |
| {{Item}} | {{Name}} | {{Date}} |

**5. Internal sponsor**
{{Internal sponsor name + title}} has approved this purchase pending procurement sign-off.

If anything is missing, reply to this email and I will turn it around the same business day.

{{AE name}} • {{Phone}}',
 'negotiation', NULL,
 '["playbook","playbook:email","procurement","paper-process"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🧾', 'https://github.com/cloudflare/skills'),

('pb-nc-close', 'gem', 'Closing question pattern — the trial close',
 'Three closing patterns SEs use to get a clear yes/no without sounding like a closer.',
 '# Three Trial Close Patterns

## 1. The reverse close
> "If we delivered everything we have agreed to in the SOW, on the timeline we agreed, at the price we agreed — is there any reason you would not move forward?"

If they say no → you have a verbal commit, push to signature.
If they say yes → you have just surfaced the actual blocker. Address that, not price.

## 2. The "what would have to be true" close
> "What would have to be true for you to feel comfortable signing this {{by Friday / by quarter end}}?"

The answer becomes your close plan. Get every item in writing.

## 3. The "decision audit" close
> "Walk me through how this decision actually gets made from here. Who reviews, who signs, what happens after that?"

Two outcomes:
- They walk you through a clean path → you have the close plan.
- They cannot walk you through it → there is a hidden stakeholder. Find them before close.

> Pick one. Use it once. Do not stack closes — it makes you sound like a closer instead of an advisor.',
 'negotiation', NULL,
 '["playbook","playbook:close","talk-track","closing"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🎯', 'https://github.com/cloudflare/skills');

-- ────────────────────────────────────────────────────────────────────────────
-- STAGE: Renewals & Retention
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO ai_solutions (id, type, title, description, content, sales_stage, product, tags, author_email, author_name, is_starter, is_pinned, icon, source_url) VALUES
('pb-rr-qbr', 'gem', 'QBR storyline that earns the next contract',
 'A 5-slide QBR template that shifts the meeting from "status update" to "renewal momentum".',
 '# QBR Storyline (5 slides)

## Slide 1 — The story we are telling today
- 1 sentence on the business outcome we set out to deliver 12 months ago
- 1 sentence on what we will measure today
- 1 sentence on what comes next

## Slide 2 — Value realised
- Top 3 metrics improved YoY (with absolute deltas)
- Top 1 metric that did **not** move (own it)
- 1 quote from a named user inside their org

## Slide 3 — Risk we removed
- N attacks blocked / threats stopped
- N tickets avoided / agent hours returned
- 1 incident we caught that they would have missed

## Slide 4 — Opportunity ahead
- 2 capabilities that exist today they are not yet using → ${{value}}
- 1 capability shipping in the next quarter that maps to {{specific upcoming initiative}}
- The expansion play, named, with a price band

## Slide 5 — Mutual asks
- What we need from them in the next 90 days
- What they need from us
- Date of next review

> The point of the QBR is not to brag. It is to make the renewal conversation the next 30 minutes after this slide deck — not 6 weeks of negotiation.',
 'renewals', NULL,
 '["playbook","playbook:talk-track","qbr","renewal"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🏁', 'https://github.com/cloudflare/skills'),

('pb-rr-at-risk', 'gem', 'At-risk renewal — exec sponsor email',
 'When renewal is wobbling, this is the email an SE / AE writes to escalate without burning the relationship.',
 'Subject: {{Customer}} renewal — would value 20 minutes with you

Hi {{Exec Sponsor}},

I want to be straight with you. Your team is in the middle of evaluating whether to renew {{Cloudflare Product / Bundle}} for next year, and the signals I am picking up tell me we are not landing the way we should be.

Here is what I am hearing from {{Champion}} and the technical teams:
- {{Concern 1, in their words}}
- {{Concern 2, in their words}}
- {{Concern 3, in their words}}

Here is what I believe is true:
- {{Counter-evidence — e.g. "Your traffic doubled YoY and we maintained <2ms p95 added latency."}}
- {{Counter-evidence — e.g. "We blocked {{N}} attacks against {{workload}} that would have been customer-facing incidents."}}
- {{Counter-evidence — e.g. "We shipped {{capability}} in {{Q}} that you specifically asked for in last QBR."}}

I am not asking you to overrule your team. I am asking for 20 minutes to show you the data we are seeing, and to hear what we are missing. If after that you still want to wind down, I will help your team do it cleanly. If you want to keep going, we will write down what needs to change and own it.

Are you available {{day/time}} or {{day/time}} this week?

{{AE name}}
{{Phone}}',
 'renewals', NULL,
 '["playbook","playbook:email","at-risk","escalation"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '🚨', 'https://github.com/cloudflare/skills'),

('pb-rr-expansion', 'gem', 'Expansion discovery — 6 questions',
 'Six discovery questions that surface real expansion opportunities (not "do you also want this thing?").',
 '# Expansion Discovery — 6 Questions

1. **What new initiative is {{Customer}} betting on in the next 12 months that did not exist last year?**
   *(AI workloads, new geographies, new business unit, M&A, new compliance regime — the answer is the door to net-new.)*

2. **Which other vendor in your security or networking stack is up for renewal in the next 6 months — and how is that conversation going?**
   *(Renewal pain in another vendor = consolidation opportunity for us.)*

3. **What was the most painful incident in the last 6 months — and which team owned the fix?**
   *(Pain → owner → budget. The owner is your next champion.)*

4. **Where in your environment do you still have hardware appliances or licensed software that you would replace if you could?**
   *(Surfaces SSE, Magic WAN, Tunnel, R2 — anywhere you can disrupt a hardware/SaaS line item.)*

5. **What is the team that uses Cloudflare today asking for that we do not yet do?**
   *(Catches roadmap-aligned expansion early.)*

6. **If I came back to you in 6 months with a single play that could materially move {{their north-star metric}}, who else inside {{Customer}} would you want me to talk to?**
   *(Earns warm intros to net-new business units.)*

Run this once a quarter, ideally inside a QBR. You will leave with at least one named expansion lead.',
 'renewals', NULL,
 '["playbook","playbook:discovery","expansion","upsell"]',
 'system@cloudflare.com', 'SE Messaging Playbook', 1, 1, '📊', 'https://github.com/cloudflare/skills');

-- ────────────────────────────────────────────────────────────────────────────
-- Done. Total inserted: 22 playbook artifacts across 6 stages.
-- ────────────────────────────────────────────────────────────────────────────
