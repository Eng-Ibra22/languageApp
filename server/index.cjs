require('dotenv').config({ path: process.env.SERVER_ENV_FILE || undefined });
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'lingua_local_dev_secret_change_in_production');
// SQLITE_DB_PATH is Railway-volume friendly; DATABASE_PATH remains supported for existing deployments.
const DB_PATH = process.env.SQLITE_DB_PATH || process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim());

if (!JWT_SECRET) throw new Error('JWT_SECRET must be set in production.');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dark_mode INTEGER DEFAULT 0,
    preferred_language TEXT DEFAULT 'English',
    daily_goal INTEGER DEFAULT 1,
    notifications_enabled INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    type TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL,
    content TEXT NOT NULL,
    quiz_data TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 10
  );
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    completed_date TEXT,
    UNIQUE(user_id, lesson_id)
  );
`);

const curriculum = [
  ['en-greetings', 'English greetings', 'Start everyday conversations with natural greetings.', 'English', 'Beginner', 'Vocabulary', 1, 20, 'Hello', 'Hi there'],
  ['en-introductions', 'Introduce yourself', 'Learn to share your name and ask someone else’s.', 'English', 'Beginner', 'Speaking', 2, 20, 'My name is', 'Nice to meet you'],
  ['ar-greetings', 'Arabic greetings', 'Learn common Arabic greetings and replies.', 'Arabic', 'Beginner', 'Vocabulary', 1, 20, 'مرحبا', 'أهلاً وسهلاً'],
  ['ar-introductions', 'Arabic introductions', 'Introduce yourself politely in Arabic.', 'Arabic', 'Beginner', 'Speaking', 2, 20, 'اسمي', 'تشرفت بمعرفتك'],
  ['tr-greetings', 'Turkish greetings', 'Use friendly Turkish greetings with confidence.', 'Turkish', 'Beginner', 'Vocabulary', 1, 20, 'Merhaba', 'Nasılsın?'],
  ['tr-introductions', 'Turkish introductions', 'Say your name and meet someone in Turkish.', 'Turkish', 'Beginner', 'Speaking', 2, 20, 'Benim adım', 'Memnun oldum'],
  ['so-greetings', 'Somali greetings', 'Practice the everyday greetings used in Somali.', 'Somali', 'Beginner', 'Vocabulary', 1, 20, 'Salaan', 'Sidee tahay?'],
  ['so-introductions', 'Somali introductions', 'Introduce yourself clearly in Somali.', 'Somali', 'Beginner', 'Speaking', 2, 20, 'Magacaygu waa', 'Waan ku faraxsanahay']
];
const insertLesson = db.prepare(`INSERT OR IGNORE INTO lessons (id,title,description,language,level,type,display_order,xp_reward,content,quiz_data,duration_minutes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const seedLessons = db.transaction(() => curriculum.forEach(([id, title, description, language, level, type, order, xp, phrase, reply]) => {
  const content = JSON.stringify({ sections: [{ title: 'Key phrase', body: `${phrase} is a useful ${language} phrase. Repeat it aloud and use it in a short conversation.`, examples: [phrase, reply] }] });
  const quiz = JSON.stringify([{ question: `Which phrase belongs in this ${language} lesson?`, options: [phrase, 'Goodbye', 'Thank you', 'Please'], correct: phrase }]);
  insertLesson.run(id, title, description, language, level, type, order, xp, content, quiz, 8);
}));
seedLessons();
const insertAchievement = db.prepare('INSERT OR IGNORE INTO achievements (id,title,description,type,requirement_value) VALUES (?,?,?,?,?)');
[['first-step', 'First Step', 'Complete your first lesson.', 'lessons', 1], ['xp-100', 'Century Club', 'Earn 100 XP.', 'xp', 100], ['polyglot', 'Four Voices', 'Learn in all four languages.', 'language', 4]].forEach((row) => insertAchievement.run(...row));

app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error('Origin not allowed')); }, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const attempts = new Map();
function rateLimit(limit, windowMs) { return (req, res, next) => { const key = `${req.ip}:${req.path}`; const now = Date.now(); const item = attempts.get(key) || { count: 0, reset: now + windowMs }; if (now > item.reset) { item.count = 0; item.reset = now + windowMs; } item.count += 1; attempts.set(key, item); if (item.count > limit) return res.status(429).json({ error: 'Too many requests. Please try again later.' }); next(); }; }
function requireAuth(req, res, next) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: 'Unauthorized' }); try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ error: 'Session expired. Please log in again.' }); } }
function publicUser(row) { return { id: String(row.id), email: row.email, full_name: row.full_name || '', name: row.full_name || row.email.split('@')[0], created_date: row.created_at }; }
function validEmail(email) { return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function issueToken(user) { return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' }); }

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/register', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  const { email, password, full_name = '' } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string' || password.length < 10) return res.status(400).json({ error: 'Use a valid email and a password of at least 10 characters.' });
  if (String(full_name).length > 100) return res.status(400).json({ error: 'Name is too long.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase())) return res.status(409).json({ error: 'An account with this email already exists.' });
  const info = db.prepare('INSERT INTO users (email,password_hash,full_name) VALUES (?,?,?)').run(email.toLowerCase(), await bcrypt.hash(password, 12), String(full_name).trim());
  db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(info.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
  res.status(201).json({ access_token: issueToken(user), user: publicUser(user) });
});
app.post('/api/auth/login', rateLimit(15, 15 * 60 * 1000), async (req, res) => {
  const { email, password } = req.body || {}; const row = validEmail(email) ? db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) : null;
  if (!row || typeof password !== 'string' || !(await bcrypt.compare(password, row.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ access_token: issueToken(row), user: publicUser(row) });
});
app.get('/api/auth/me', requireAuth, (req, res) => { const row = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id); if (!row) return res.status(404).json({ error: 'User not found.' }); res.json(publicUser(row)); });
app.post('/api/auth/logout', requireAuth, (_req, res) => res.status(204).end());
app.post('/api/auth/forgot-password', rateLimit(5, 60 * 60 * 1000), async (req, res) => {
  const email = req.body?.email; const row = validEmail(email) ? db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) : null;
  if (row) { const token = crypto.randomBytes(32).toString('hex'); const tokenHash = crypto.createHash('sha256').update(token).digest('hex'); db.prepare('UPDATE password_reset_tokens SET used_at=datetime(\'now\') WHERE user_id=? AND used_at IS NULL').run(row.id); db.prepare('INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES (?,?,datetime(\'now\',\'+1 hour\'))').run(row.id, tokenHash); const link = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`; await deliverResetEmail(row.email, link); }
  res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
});
async function deliverResetEmail(email, link) { if (process.env.RESET_EMAIL_WEBHOOK_URL) { const response = await fetch(process.env.RESET_EMAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.RESET_EMAIL_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.RESET_EMAIL_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify({ to: email, subject: 'Reset your Lingua password', text: `Reset your password: ${link}`, resetUrl: link }), signal: AbortSignal.timeout(10000) }); if (!response.ok) console.error('Password reset email provider failed:', response.status); } else if (process.env.NODE_ENV !== 'production') console.info(`[password reset] ${link}`); else console.error('RESET_EMAIL_WEBHOOK_URL is not configured; password reset email was not delivered.'); }
app.post('/api/auth/reset-password', rateLimit(5, 60 * 60 * 1000), async (req, res) => {
  const { token, newPassword } = req.body || {}; if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 10) return res.status(400).json({ error: 'Invalid reset request.' });
  const hash = crypto.createHash('sha256').update(token).digest('hex'); const reset = db.prepare("SELECT * FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at > datetime('now')").get(hash); if (!reset) return res.status(400).json({ error: 'This reset link is invalid or expired.' });
  db.transaction(() => { db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 12), reset.user_id); db.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE id=?").run(reset.id); })(); res.status(204).end();
});

app.get('/api/lessons', requireAuth, (req, res) => { const params = []; let sql = 'SELECT * FROM lessons'; if (req.query.language) { sql += ' WHERE language=?'; params.push(req.query.language); } sql += ' ORDER BY display_order'; res.json(db.prepare(sql).all(...params).map(lessonShape)); });
// Compatibility route for clients that call their learning units “courses”.
app.get('/api/courses', requireAuth, (_req, res) => res.json(db.prepare('SELECT * FROM lessons ORDER BY display_order').all().map(lessonShape)));
app.get('/api/lessons/:id', requireAuth, (req, res) => { const row = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id); if (!row) return res.status(404).json({ error: 'Lesson not found.' }); res.json(lessonShape(row)); });
function lessonShape(row) { return { ...row, order: row.display_order }; }
app.get('/api/achievements', requireAuth, (_req, res) => res.json(db.prepare('SELECT * FROM achievements').all()));
app.get('/api/progress', requireAuth, (req, res) => res.json(db.prepare('SELECT lesson_id,language,completed,score,xp_earned,completed_date FROM user_progress WHERE user_id=? ORDER BY completed_date DESC').all(req.user.id).map((row) => ({ ...row, completed: Boolean(row.completed) }))));
app.put('/api/progress/:lessonId', requireAuth, (req, res) => { const lesson = db.prepare('SELECT id,language,xp_reward FROM lessons WHERE id=?').get(req.params.lessonId); if (!lesson) return res.status(404).json({ error: 'Lesson not found.' }); const score = Number(req.body?.score); if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ error: 'Score must be between 0 and 100.' }); const xp = Math.round((score / 100) * lesson.xp_reward); db.prepare(`INSERT INTO user_progress (user_id,lesson_id,language,completed,score,xp_earned,completed_date) VALUES (?,?,?,1,?,?,datetime('now')) ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed=1,score=MAX(score,excluded.score),xp_earned=MAX(xp_earned,excluded.xp_earned),completed_date=excluded.completed_date`).run(req.user.id, lesson.id, lesson.language, score, xp); res.json({ lesson_id: lesson.id, language: lesson.language, completed: true, score, xp_earned: xp }); });
app.get('/api/profile', requireAuth, (req, res) => { const row = db.prepare('SELECT u.email,u.full_name,p.dark_mode,p.preferred_language,p.daily_goal,p.notifications_enabled FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=?').get(req.user.id); res.json({ ...row, dark_mode: Boolean(row.dark_mode), notifications_enabled: Boolean(row.notifications_enabled) }); });
app.patch('/api/profile', requireAuth, (req, res) => { const { full_name, dark_mode, preferred_language, daily_goal, notifications_enabled } = req.body || {}; if (full_name !== undefined) db.prepare('UPDATE users SET full_name=? WHERE id=?').run(String(full_name).slice(0, 100).trim(), req.user.id); if (dark_mode !== undefined) db.prepare('UPDATE profiles SET dark_mode=? WHERE user_id=?').run(dark_mode ? 1 : 0, req.user.id); if (notifications_enabled !== undefined) db.prepare('UPDATE profiles SET notifications_enabled=? WHERE user_id=?').run(notifications_enabled ? 1 : 0, req.user.id); if (preferred_language !== undefined && ['English','Arabic','Turkish','Somali'].includes(preferred_language)) db.prepare('UPDATE profiles SET preferred_language=? WHERE user_id=?').run(preferred_language, req.user.id); if (daily_goal !== undefined && Number.isInteger(daily_goal) && daily_goal >= 1 && daily_goal <= 20) db.prepare('UPDATE profiles SET daily_goal=? WHERE user_id=?').run(daily_goal, req.user.id); res.json({ updated: true }); });
app.post('/api/translate', requireAuth, rateLimit(30, 60 * 1000), async (req, res) => { const { text, from, to } = req.body || {}; if (typeof text !== 'string' || !text.trim() || text.length > 500 || !['English','Arabic','Turkish','Somali'].includes(from) || !['English','Arabic','Turkish','Somali'].includes(to) || from === to) return res.status(400).json({ error: 'Provide a phrase and two different supported languages.' }); const translation = await translate(text.trim(), from, to); res.json({ translation, pronunciation: '', example_sentence: '', example_translation: '', memory_tip: 'Repeat the translation aloud, then use it in a short sentence.' }); });
async function translate(text, from, to) { const url = process.env.TRANSLATION_API_URL; if (!url) return `[${to}] ${text}`; const languages = { English: 'en', Arabic: 'ar', Turkish: 'tr', Somali: 'so' }; const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.TRANSLATION_API_KEY ? { Authorization: `Bearer ${process.env.TRANSLATION_API_KEY}` } : {}) }, body: JSON.stringify({ q: text, source: languages[from], target: languages[to], format: 'text' }), signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new Error('Translation provider unavailable.'); const data = await response.json(); return data.translatedText || data.translation || text; }
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production' || Boolean(process.env.RAILWAY_STATIC_URL);
if (isProduction) { const distPath = path.join(__dirname, '..', 'dist'); app.use(express.static(distPath)); app.get('/{*splat}', (_req, res) => res.sendFile(path.join(distPath, 'index.html'))); }
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Unexpected server error.' }); });

if (require.main === module) app.listen(PORT, () => console.log(`Lingua API running at http://localhost:${PORT}`));
module.exports = { app, db };
