-- Seed URL Assets
INSERT OR IGNORE INTO url_assets (id, title, url, category, description, owner, likes, date_added, icon, image_url, tags) VALUES
('1', 'Cloudflare Workers Documentation', 'https://developers.cloudflare.com/workers/', 'documentation', 'Comprehensive guide to building serverless applications with Cloudflare Workers. Covers fundamentals, API reference, and best practices.', 'Mike Chen', 24, '2025-10-29', '📚', 'https://www.cloudflare.com/favicon.ico', '["workers","serverless","documentation"]'),
('2', 'D1 Database Best Practices', 'https://developers.cloudflare.com/d1/', 'resource', 'Essential patterns and optimization techniques for Cloudflare D1. Includes query optimization, indexing strategies, and connection pooling tips.', 'Sarah Park', 42, '2025-10-27', '🗄️', '', '["d1","database","optimization"]'),
('3', 'Security Configuration Checklist', 'https://example.com/security-checklist', 'guide', 'Step-by-step security hardening guide for production deployments. Covers WAF rules, DDoS protection, and API security best practices.', 'Alex Kumar', 18, '2025-10-25', '🔒', '', '["security","waf","best-practices"]'),
('4', 'API Integration Examples', 'https://github.com/cloudflare/api-examples', 'code', 'Collection of production-ready code examples demonstrating Cloudflare API integration patterns across multiple languages and frameworks.', 'Jordan Lee', 35, '2025-10-23', '💻', '', '["api","examples","integration"]'),
('5', 'Performance Optimization Guide', 'https://blog.cloudflare.com/performance', 'article', 'Deep dive into performance optimization techniques for Cloudflare services. Real-world case studies and benchmarking methodologies included.', 'Emily Rodriguez', 51, '2025-10-16', '⚡', '', '["performance","optimization","caching"]');

-- Seed File Assets
INSERT OR IGNORE INTO file_assets (id, name, type, category, size, downloads, date, icon) VALUES
('1', 'Customer Demo Template', 'presentation', 'template', '2.4 MB', 47, '2 days ago', '📊'),
('2', 'Architecture Diagram Kit', 'design', 'design', '1.8 MB', 35, '1 week ago', '🏗️'),
('3', 'ROI Calculator Spreadsheet', 'spreadsheet', 'tool', '524 KB', 62, '3 days ago', '📈'),
('4', 'Security Best Practices Guide', 'document', 'guide', '1.2 MB', 89, '1 day ago', '🔒'),
('5', 'Product Comparison Sheet', 'spreadsheet', 'template', '856 KB', 41, '5 days ago', '📋'),
('6', 'Onboarding Checklist', 'document', 'guide', '432 KB', 73, '2 weeks ago', '✅');

-- Seed Scripts
INSERT OR IGNORE INTO scripts (id, name, language, category, description, author, likes, uses, date, icon, code) VALUES
('1', 'Cloudflare API Auth Helper', 'javascript', 'api', 'Quick authentication setup for Cloudflare API calls', 'Mike Chen', 24, 67, '1 week ago', '🔑', 'const API_TOKEN = process.env.CF_API_TOKEN;\nconst headers = {\n  ''Authorization'': `Bearer ${API_TOKEN}`,\n  ''Content-Type'': ''application/json''\n};'),
('2', 'Worker Deployment Script', 'bash', 'automation', 'Automated deployment for multiple Workers', 'Sarah Park', 31, 45, '3 days ago', '🚀', '#!/bin/bash\nfor worker in workers/*; do\n  cd $worker && wrangler deploy\ndone'),
('3', 'D1 Query Builder', 'typescript', 'database', 'Type-safe D1 query builder utility', 'Alex Kumar', 19, 38, '5 days ago', '🗄️', 'export const queryBuilder = (db: D1Database) => ({\n  select: (table: string) => db.prepare(`SELECT * FROM ${table}`)\n});'),
('4', 'Rate Limiter Middleware', 'typescript', 'security', 'Simple rate limiting for Workers', 'Jordan Lee', 42, 91, '2 days ago', '🛡️', 'export async function rateLimit(request, env) {\n  const key = new URL(request.url).pathname;\n  const count = await env.KV.get(key);\n  if (count > 100) throw new Error(''Rate limit'');\n}');

-- Seed Events
INSERT OR IGNORE INTO events (id, title, type, date, time, location, attendees, description, icon, color) VALUES
('1', 'SE Team Sync', 'meeting', 'Tomorrow', '10:00 AM - 11:00 AM', 'Zoom', 12, 'Monthly knowledge sharing and team updates', '👥', '#F6821F'),
('2', 'Cloudflare Connect 2025', 'conference', 'Mar 15, 2025', 'All Day', 'San Francisco, CA', 248, 'Annual Cloudflare customer and partner conference', '🎪', '#0051C3'),
('3', 'Demo Friday', 'demo', 'This Friday', '2:00 PM - 3:00 PM', 'Main Conference Room', 8, 'Weekly demo session - show off your wins!', '🎬', '#10B981'),
('4', 'API Workshop', 'workshop', 'Next Week', '1:00 PM - 4:00 PM', 'Training Room', 15, 'Hands-on Cloudflare API integration workshop', '🛠️', '#8B5CF6'),
('5', 'Team Happy Hour', 'social', 'Next Friday', '5:00 PM', 'The Orange Room', 22, 'Unwind and celebrate the week!', '🍻', '#F59E0B'),
('6', 'Q1 Planning Session', 'planning', 'Jan 10, 2025', '9:00 AM - 12:00 PM', 'Executive Conference Room', 6, 'Strategic planning for Q1 objectives', '📊', '#EF4444');

-- Seed Shoutouts
INSERT OR IGNORE INTO shoutouts (id, from_user, to_user, message, category, likes, date, icon) VALUES
('1', 'Mike Chen', 'Sarah Park', 'Absolutely crushed the customer demo today! The technical deep-dive was perfect and we closed the deal. Amazing work! 🎉', 'achievement', 24, '2 hours ago', '🏆'),
('2', 'Alex Kumar', 'Jordan Lee', 'Your new automation script saved our team 10+ hours this week. You''re a lifesaver! Thank you! 🙏', 'helpful', 18, '5 hours ago', '💪'),
('3', 'Sarah Park', 'Team', 'Shoutout to everyone who participated in the Q4 planning! Great energy and ideas all around. Let''s crush these goals! 🚀', 'teamwork', 31, 'Yesterday', '🤝'),
('4', 'Jordan Lee', 'Mike Chen', 'Mike always goes above and beyond to help teammates. Your mentorship on the API integration was invaluable! 🌟', 'mentorship', 22, 'Yesterday', '👨‍🏫'),
('5', 'Emily Rodriguez', 'Alex Kumar', 'Your presentation at the all-hands was inspiring! Love the creative approach to solving that challenge. 💡', 'innovation', 27, '2 days ago', '💡'),
('6', 'Chris Taylor', 'Sarah Park', 'Sarah pulled an all-nighter to help fix the production issue. True dedication to the team and customers! 🔥', 'dedication', 35, '3 days ago', '🔥');
