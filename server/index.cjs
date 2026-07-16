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

// ─── RICH 36-LESSON CURRICULUM ───────────────────────────────────────────────
// 4 languages × 3 tiers (Beginner / Intermediate / Advanced) × 3 lessons each
// Each lesson: authentic content with sections, examples, and 3-question quiz.

function makeLesson(id, title, description, language, level, type, order, xp, sections, quizItems, duration) {
  const content = JSON.stringify({ sections });
  const quiz_data = JSON.stringify(quizItems);
  return [id, title, description, language, level, type, order, xp, content, quiz_data, duration];
}

const CURRICULUM = [
  // ── ENGLISH ──────────────────────────────────────────────────────────────

  makeLesson('en-alphabet', 'The English Alphabet', 'Learn all 26 letters and their sounds.', 'English', 'Beginner', 'Vocabulary', 1, 20,
    [
      { title: 'The 26 Letters', body: 'English uses the Latin alphabet with 26 letters: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z. They come in uppercase and lowercase forms.', examples: ['A (Apple) — B (Book) — C (Cat)', 'D (Dog) — E (Elephant) — F (Fish)', 'Vowels: A, E, I, O, U — all other letters are consonants'] },
      { title: 'Vowel Sounds', body: 'Vowels are the backbone of English pronunciation. Each vowel can have a short or long sound depending on the word.', examples: ['Short A: cat, hat, bat', 'Long A: cake, lake, name', 'Short E: bed, red, ten | Long E: see, tree, be'] },
    ],
    [
      { question: 'How many letters are in the English alphabet?', options: ['24', '26', '28', '22'], correct: '26' },
      { question: 'Which of these is a vowel?', options: ['B', 'C', 'E', 'G'], correct: 'E' },
      { question: 'Which word has a long "A" sound?', options: ['cat', 'hat', 'cake', 'lap'], correct: 'cake' },
    ], 8),

  makeLesson('en-greetings', 'Essential Greetings', 'Start everyday conversations naturally.', 'English', 'Beginner', 'Speaking', 2, 20,
    [
      { title: 'Formal Greetings', body: 'Use these in professional or unfamiliar settings. They show respect and courtesy.', examples: ['Good morning! (used before noon)', 'Good afternoon! (noon to evening)', 'Good evening! (after sunset)', 'How do you do? (very formal, first meeting)'] },
      { title: 'Casual Greetings', body: 'With friends, family, or people your own age, these feel natural and warm.', examples: ['Hey! / Hi there!', 'How\'s it going?', 'What\'s up? (very informal)', 'Long time no see! (after time apart)'] },
    ],
    [
      { question: 'Which greeting is appropriate before noon?', options: ['Good evening', 'Good night', 'Good morning', 'Good afternoon'], correct: 'Good morning' },
      { question: '"What\'s up?" is best used with...', options: ['Your boss', 'A judge', 'A close friend', 'A doctor'], correct: 'A close friend' },
      { question: 'What does "Long time no see!" mean?', options: ['Goodbye', 'You haven\'t met before', 'You haven\'t seen each other in a while', 'Nice to meet you'], correct: 'You haven\'t seen each other in a while' },
    ], 10),

  makeLesson('en-numbers', 'Numbers 1–20', 'Count and use numbers in everyday conversation.', 'English', 'Beginner', 'Vocabulary', 3, 20,
    [
      { title: 'Numbers 1–10', body: 'The foundation of counting. These must be memorized as they do not follow a pattern.', examples: ['1 = One, 2 = Two, 3 = Three, 4 = Four, 5 = Five', '6 = Six, 7 = Seven, 8 = Eight, 9 = Nine, 10 = Ten'] },
      { title: 'Numbers 11–20 (the "teens")', body: 'From 11 onwards, English uses a mix of roots. 11 and 12 are irregular — learn them separately.', examples: ['11 = Eleven, 12 = Twelve (irregular!)', '13 = Thirteen, 14 = Fourteen, 15 = Fifteen', '16 = Sixteen, 17 = Seventeen, 18 = Eighteen, 19 = Nineteen, 20 = Twenty'] },
    ],
    [
      { question: 'How do you say "8" in English?', options: ['Eighteen', 'Eighty', 'Eight', 'Ate'], correct: 'Eight' },
      { question: 'Which number is spelled "Twelve"?', options: ['10', '11', '12', '13'], correct: '12' },
      { question: '"Fifteen" represents which number?', options: ['13', '14', '15', '16'], correct: '15' },
    ], 8),

  makeLesson('en-conv-phrases', 'Conversational Phrases', 'Sound natural in everyday English dialogue.', 'English', 'Intermediate', 'Speaking', 4, 35,
    [
      { title: 'Starting & Keeping a Conversation', body: 'These phrases let you open topics smoothly and keep the dialogue flowing without awkward pauses.', examples: ['By the way... (introducing a new topic)', 'Speaking of which... (connecting related ideas)', 'That reminds me... (a natural transition)', 'Anyway, where were we? (resuming after a digression)'] },
      { title: 'Showing Agreement & Disagreement', body: 'Expressing your opinion clearly but politely is key in English conversation.', examples: ['I couldn\'t agree more! (strong agreement)', 'That\'s a fair point, but... (polite disagreement)', 'I see what you mean, however... (acknowledging + disagreeing)', 'I\'m not so sure about that. (gentle doubt)'] },
    ],
    [
      { question: 'Which phrase introduces a new topic?', options: ['That\'s fair', 'By the way', 'I agree', 'Never mind'], correct: 'By the way' },
      { question: '"I couldn\'t agree more" expresses...', options: ['Strong disagreement', 'Confusion', 'Strong agreement', 'Surprise'], correct: 'Strong agreement' },
      { question: '"That reminds me" is used to...', options: ['End a conversation', 'Transition to a related topic', 'Ask a question', 'Greet someone'], correct: 'Transition to a related topic' },
    ], 12),

  makeLesson('en-past-tense', 'Past Tense Verbs', 'Talk about events that already happened.', 'English', 'Intermediate', 'Grammar', 5, 35,
    [
      { title: 'Regular Past Tense (-ed)', body: 'Add "-ed" to most verbs to put them in the past. Watch out for spelling changes.', examples: ['Walk → Walked: "I walked to school."', 'Talk → Talked: "We talked for hours."', 'Play → Played: "She played football."', 'Stop → Stopped (double final consonant): "He stopped the car."'] },
      { title: 'Irregular Past Tense', body: 'The most common English verbs are irregular — they change form unpredictably. These must be memorized.', examples: ['Go → Went: "They went to the market."', 'See → Saw: "I saw a beautiful sunset."', 'Eat → Ate: "We ate dinner together."', 'Come → Came: "She came home late."'] },
    ],
    [
      { question: 'What is the past tense of "walk"?', options: ['Walked', 'Walkt', 'Walking', 'Walks'], correct: 'Walked' },
      { question: 'What is the past tense of "go"?', options: ['Goed', 'Goes', 'Went', 'Gone'], correct: 'Went' },
      { question: 'Which sentence uses past tense correctly?', options: ['She eats yesterday.', 'She ate yesterday.', 'She eating yesterday.', 'She eat yesterday.'], correct: 'She ate yesterday.' },
    ], 14),

  makeLesson('en-directions', 'Asking for Directions', 'Navigate any city confidently in English.', 'English', 'Intermediate', 'Speaking', 6, 35,
    [
      { title: 'Asking the Way', body: 'Polite openers are essential when asking strangers for help. Always start with "Excuse me."', examples: ['Excuse me, could you tell me how to get to...?', 'Sorry to bother you, where is the nearest...?', 'Is this the right way to...?', 'How far is it to...?'] },
      { title: 'Giving & Understanding Directions', body: 'Key direction words to listen for and use.', examples: ['Turn left / Turn right at the traffic lights.', 'Go straight ahead for two blocks.', 'It\'s on your left / right.', 'Take the second turning on the right.', 'It\'s opposite the supermarket.'] },
    ],
    [
      { question: 'What is the polite opener when asking directions?', options: ['Hey you!', 'Excuse me', 'Listen', 'Wait'], correct: 'Excuse me' },
      { question: '"Go straight ahead" means...', options: ['Turn left', 'Turn right', 'Don\'t turn, keep going forward', 'Go back'], correct: 'Don\'t turn, keep going forward' },
      { question: '"It\'s opposite the supermarket" means...', options: ['Next to it', 'Inside it', 'Directly facing it across the street', 'Behind it'], correct: 'Directly facing it across the street' },
    ], 12),

  makeLesson('en-idioms', 'English Idioms & Expressions', 'Sound like a native speaker with natural idioms.', 'English', 'Advanced', 'Vocabulary', 7, 50,
    [
      { title: 'Common Idioms (A–M)', body: 'Idioms are phrases whose meaning is figurative, not literal. Native speakers use them constantly.', examples: ['"Break a leg!" — Good luck! (used before a performance)', '"Hit the nail on the head" — to say something exactly right', '"Let the cat out of the bag" — to accidentally reveal a secret', '"Bite off more than you can chew" — to take on too much'] },
      { title: 'Common Idioms (N–Z)', body: 'These idioms are especially common in professional and social contexts.', examples: ['"On the fence" — undecided about something', '"Spill the beans" — to reveal secret information', '"The ball is in your court" — it\'s your turn to take action', '"Under the weather" — feeling ill or unwell'] },
    ],
    [
      { question: '"Break a leg!" means...', options: ['Be careful', 'Good luck', 'Hurry up', 'Stop'], correct: 'Good luck' },
      { question: '"Under the weather" means you are...', options: ['Outdoors', 'Happy', 'Feeling ill', 'Lost'], correct: 'Feeling ill' },
      { question: '"The ball is in your court" means...', options: ['Play a sport', 'It\'s your turn to act', 'You are right', 'Go outside'], correct: 'It\'s your turn to act' },
    ], 15),

  makeLesson('en-complex', 'Complex Sentence Structures', 'Build sophisticated, nuanced sentences.', 'English', 'Advanced', 'Grammar', 8, 50,
    [
      { title: 'Subordinate Clauses', body: 'A subordinate clause adds extra information to a main clause. It cannot stand alone as a sentence.', examples: ['Although it was raining, we went for a walk. (concession)', 'She left early because she had an appointment. (reason)', 'I\'ll call you when I arrive. (time)', 'Unless you study hard, you won\'t pass. (condition)'] },
      { title: 'Relative Clauses', body: 'Relative clauses give more information about a noun using who, which, that, where.', examples: ['The book that I recommended is on sale.', 'The woman who called yesterday is my aunt.', 'That\'s the café where we first met.', 'The report which he submitted was excellent.'] },
    ],
    [
      { question: 'Which word introduces a reason clause?', options: ['Although', 'Unless', 'Because', 'Where'], correct: 'Because' },
      { question: '"The book that I recommended" — "that" introduces a...', options: ['Main clause', 'Relative clause', 'Time clause', 'Condition clause'], correct: 'Relative clause' },
      { question: '"Unless you study, you won\'t pass" expresses...', options: ['A reason', 'A condition', 'A time', 'A concession'], correct: 'A condition' },
    ], 18),

  makeLesson('en-opinions', 'Expressing Opinions', 'Argue, debate, and express views with confidence.', 'English', 'Advanced', 'Speaking', 9, 50,
    [
      { title: 'Stating Your Opinion', body: 'In formal and informal contexts, framing your opinion clearly shows confidence and clarity.', examples: ['In my view, / From my perspective, ...', 'I firmly believe that ...', 'It seems to me that ...', 'As far as I\'m concerned, ...'] },
      { title: 'Supporting & Countering Arguments', body: 'Strong communicators both support their ideas and address opposing views gracefully.', examples: ['This is supported by the fact that...', 'A key reason for this is...', 'Critics might argue that... however...', 'While it\'s true that..., the evidence shows...'] },
    ],
    [
      { question: 'Which phrase expresses a personal opinion?', options: ['The fact is', 'Studies show', 'In my view', 'Everyone knows'], correct: 'In my view' },
      { question: '"Critics might argue that... however..." is used to...', options: ['Agree strongly', 'Acknowledge and then counter an opposing view', 'State a fact', 'Ask a question'], correct: 'Acknowledge and then counter an opposing view' },
      { question: '"I firmly believe that" shows...', options: ['Uncertainty', 'Strong personal conviction', 'Disagreement', 'A question'], correct: 'Strong personal conviction' },
    ], 18),

  // ── ARABIC ───────────────────────────────────────────────────────────────

  makeLesson('ar-alphabet', 'Arabic Alphabet (الحروف)', 'Master the 28 Arabic letters and their forms.', 'Arabic', 'Beginner', 'Vocabulary', 1, 20,
    [
      { title: 'The Arabic Script', body: 'Arabic is written right-to-left and is cursive by nature. The alphabet has 28 letters, each with up to 4 forms depending on position in a word.', examples: ['ا (Alif) — أ ب ت ث ج ح خ', 'د ذ ر ز س ش ص ض ط ظ', 'ع غ ف ق ك ل م ن ه و ي'] },
      { title: 'Short Vowels (Harakat)', body: 'Arabic short vowels are written as small marks above or below letters. In everyday text they are often omitted, but learners should know them.', examples: ['Fatha ( َ ) → "a" sound: كَتَبَ (kataba - he wrote)', 'Kasra ( ِ ) → "i" sound: كِتَاب (kitāb - book)', 'Damma ( ُ ) → "u" sound: كُتُب (kutub - books)'] },
    ],
    [
      { question: 'How many letters are in the Arabic alphabet?', options: ['24', '26', '28', '30'], correct: '28' },
      { question: 'Arabic is written from...', options: ['Left to right', 'Right to left', 'Top to bottom', 'Bottom to top'], correct: 'Right to left' },
      { question: 'The Fatha mark produces which sound?', options: ['"i" sound', '"u" sound', '"a" sound', '"o" sound'], correct: '"a" sound' },
    ], 10),

  makeLesson('ar-greetings', 'Arabic Greetings (التحيات)', 'Greet people authentically in Arabic.', 'Arabic', 'Beginner', 'Speaking', 2, 20,
    [
      { title: 'Islamic & Universal Greetings', body: 'The most common Arabic greeting is "As-salamu alaykum" — it\'s used by all Arab people regardless of religion and is a wish of peace.', examples: ['السلام عليكم (As-salamu alaykum) — Peace be upon you', 'وعليكم السلام (Wa alaykum as-salam) — And peace be upon you (response)', 'مرحبا (Marhaba) — Hello (informal)', 'أهلاً وسهلاً (Ahlan wa sahlan) — Welcome'] },
      { title: 'Time-Based Greetings', body: 'Arabs also use greetings that vary by time of day, similar to other cultures.', examples: ['صباح الخير (Sabah al-khayr) — Good morning', 'صباح النور (Sabah an-noor) — response: "Morning of light"', 'مساء الخير (Masa\' al-khayr) — Good evening', 'مساء النور (Masa\' an-noor) — response to good evening'] },
    ],
    [
      { question: 'What is the meaning of "السلام عليكم"?', options: ['Good morning', 'Thank you', 'Peace be upon you', 'Goodbye'], correct: 'Peace be upon you' },
      { question: '"مرحبا" (Marhaba) means...', options: ['Goodbye', 'Hello', 'Thank you', 'Please'], correct: 'Hello' },
      { question: '"صباح الخير" is said in the...', options: ['Evening', 'Night', 'Morning', 'Afternoon'], correct: 'Morning' },
    ], 10),

  makeLesson('ar-numbers', 'Arabic Numbers (الأرقام)', 'Count and use numbers in Arabic.', 'Arabic', 'Beginner', 'Vocabulary', 3, 20,
    [
      { title: 'Numbers 1–10', body: 'Arabic numerals (the ones you already know: 1, 2, 3...) are actually of Arabic origin! But Arabic also has its own written word forms.', examples: ['١ واحد (wāhid) — 1', '٢ اثنان (ithnan) — 2', '٣ ثلاثة (thalātha) — 3', '٤ أربعة (arba\'a) — 4', '٥ خمسة (khamsa) — 5', '٦ ستة (sitta) — 6', '٧ سبعة (sab\'a) — 7', '٨ ثمانية (thamāniya) — 8', '٩ تسعة (tis\'a) — 9', '١٠ عشرة (\'ashara) — 10'] },
    ],
    [
      { question: 'How do you say "5" in Arabic?', options: ['أربعة', 'خمسة', 'ستة', 'سبعة'], correct: 'خمسة' },
      { question: 'The Arabic word "واحد" means...', options: ['Two', 'Three', 'One', 'Four'], correct: 'One' },
      { question: 'What is the Arabic word for "10"?', options: ['تسعة', 'ثمانية', 'عشرة', 'سبعة'], correct: 'عشرة' },
    ], 8),

  makeLesson('ar-conversations', 'Daily Arabic Conversations', 'Hold natural conversations in Arabic.', 'Arabic', 'Intermediate', 'Speaking', 4, 35,
    [
      { title: 'At a Café or Restaurant', body: 'Essential phrases for ordering food and drink politely in Arabic-speaking countries.', examples: ['أريد قهوة من فضلك (Urīd qahwa min fadlik) — I would like a coffee, please.', 'الحساب من فضلك (Al-hisāb min fadlik) — The bill, please.', 'هل يوجد طاولة فارغة؟ (Hal yūjad tāwila fārigha?) — Is there a free table?', 'اللحم أو الدجاج؟ (Al-lahm aw al-dajāj?) — Meat or chicken?'] },
      { title: 'Polite Expressions', body: 'Courtesy is deeply embedded in Arab culture. These phrases make you instantly likeable.', examples: ['شكراً جزيلاً (Shukran jazīlan) — Thank you very much.', 'عفواً (\'Afwan) — You\'re welcome / Excuse me.', 'من فضلك (Min fadlik) — Please.', 'لو سمحت (Law samaht) — If you don\'t mind / Please (slightly more formal).'] },
    ],
    [
      { question: 'How do you say "The bill, please" in Arabic?', options: ['أريد قهوة', 'الحساب من فضلك', 'هل يوجد طاولة', 'شكراً'], correct: 'الحساب من فضلك' },
      { question: '"شكراً جزيلاً" means...', options: ['Excuse me', 'Thank you very much', 'You\'re welcome', 'Please'], correct: 'Thank you very much' },
      { question: '"عفواً" can mean...', options: ['You\'re welcome OR Excuse me', 'Hello', 'Goodbye', 'Thank you'], correct: 'You\'re welcome OR Excuse me' },
    ], 14),

  makeLesson('ar-verbs', 'Arabic Verb Conjugation', 'Understand how Arabic verbs change by person.', 'Arabic', 'Intermediate', 'Grammar', 5, 35,
    [
      { title: 'Root System', body: 'Arabic verbs are built on 3-letter roots. By adding patterns to the root, you derive dozens of related words — this is the genius of Arabic.', examples: ['Root: ك-ت-ب (k-t-b) = related to writing', 'كَتَبَ (kataba) — he wrote', 'كِتَاب (kitāb) — book', 'مَكْتَبَة (maktaba) — library', 'كَاتِب (kātib) — writer'] },
      { title: 'Present Tense Conjugation', body: 'Arabic verbs conjugate to match the subject. The prefix and suffix change based on person, number, and gender.', examples: ['أَكْتُب (aktub) — I write', 'تَكْتُب (taktub) — You (masc.) write', 'تَكْتُبِين (taktubīn) — You (fem.) write', 'يَكْتُب (yaktub) — He writes', 'تَكْتُب (taktub) — She writes', 'نَكْتُب (naktub) — We write'] },
    ],
    [
      { question: 'What is the Arabic root for "writing"?', options: ['ق-ر-أ', 'ك-ت-ب', 'د-ر-س', 'س-م-ع'], correct: 'ك-ت-ب' },
      { question: '"كِتَاب" (kitāb) means...', options: ['Writer', 'Library', 'Book', 'Writing'], correct: 'Book' },
      { question: '"يَكْتُب" (yaktub) means...', options: ['I write', 'She writes', 'He writes', 'We write'], correct: 'He writes' },
    ], 15),

  makeLesson('ar-directions', 'Describing & Asking in Arabic', 'Navigate and describe locations naturally.', 'Arabic', 'Intermediate', 'Speaking', 6, 35,
    [
      { title: 'Asking for Directions', body: 'When navigating an Arabic-speaking city, these phrases will get you where you need to go.', examples: ['أين المحطة؟ (Ayna al-mahatta?) — Where is the station?', 'كيف أصل إلى...؟ (Kayfa asil ila...?) — How do I get to...?', 'هل هذا الطريق إلى...؟ (Hal hātha al-tarīq ila...?) — Is this the road to...?'] },
      { title: 'Direction Words', body: 'Core directional vocabulary that you\'ll hear in responses.', examples: ['يمين (yamīn) — right', 'يسار (yasār) — left', 'أمام (amām) — in front / ahead', 'خلف (khalf) — behind', 'بجانب (bijānib) — next to', 'مقابل (muqābil) — opposite'] },
    ],
    [
      { question: '"أين" (Ayna) means...', options: ['How', 'Where', 'When', 'Why'], correct: 'Where' },
      { question: 'The Arabic word for "left" is...', options: ['يمين', 'أمام', 'خلف', 'يسار'], correct: 'يسار' },
      { question: '"مقابل" means...', options: ['Next to', 'Behind', 'Opposite', 'Above'], correct: 'Opposite' },
    ], 12),

  makeLesson('ar-idioms', 'Arabic Proverbs & Idioms', 'Speak with wisdom using real Arabic expressions.', 'Arabic', 'Advanced', 'Vocabulary', 7, 50,
    [
      { title: 'Famous Arabic Proverbs', body: 'Arabic is rich with proverbs (أمثال, amthāl) that reflect deep cultural wisdom. Using them shows sophistication.', examples: ['"العقل زينة" (Al-\'aql zīna) — The mind is an ornament. (Intelligence is your best quality.)', '"الصبر مفتاح الفرج" (Al-sabr miftāh al-faraj) — Patience is the key to relief.', '"من جدّ وجد" (Man jadda wajada) — Whoever is diligent will succeed.'] },
      { title: 'Common Arabic Expressions', body: 'These expressions are part of everyday speech and carry cultural meaning beyond the literal words.', examples: ['"إن شاء الله" (In sha\' Allah) — If God wills. (Used for future intentions — not just a vague "maybe"!)', '"ما شاء الله" (Mā sha\' Allah) — What God has willed. (Expression of admiration)', '"الحمد لله" (Al-hamdu lillah) — Praise be to God. (Used to express gratitude or contentment)'] },
    ],
    [
      { question: '"من جدّ وجد" means...', options: ['Patience brings relief', 'Whoever is diligent succeeds', 'The mind is an ornament', 'God wills it'], correct: 'Whoever is diligent succeeds' },
      { question: '"ما شاء الله" is used to express...', options: ['Sadness', 'Anger', 'Admiration', 'Doubt'], correct: 'Admiration' },
      { question: '"الصبر مفتاح الفرج" translates to...', options: ['The mind is an ornament', 'Patience is the key to relief', 'God wills it', 'Work hard'], correct: 'Patience is the key to relief' },
    ], 18),

  makeLesson('ar-formal', 'Formal Arabic Writing', 'Write professional Arabic for modern contexts.', 'Arabic', 'Advanced', 'Writing', 8, 50,
    [
      { title: 'Modern Standard Arabic (MSA)', body: 'MSA (الفصحى, al-Fusha) is the formal register used in news, literature, official documents, and education across all Arab countries.', examples: ['Opening a letter: السيد/ة العزيز/ة (Dear Sir/Madam)', 'Formal greeting: تحية طيبة وبعد (Greetings, and after...)', 'Closing: مع خالص التحية والتقدير (With sincere greetings and respect)', 'Requesting: يُرجى التكرم بـ... (Kindly be so good as to...)'] },
      { title: 'Formal vs. Colloquial', body: 'Every Arabic country has its own dialect, but MSA is understood by all. Know the difference.', examples: ['Formal (MSA): أذهب إلى الجامعة كل يوم (I go to university every day)', 'Egyptian colloquial: بروح الجامعة كل يوم', 'Gulf colloquial: أروح الجامعة كل يوم', 'Tip: In formal writing, always use MSA.'] },
    ],
    [
      { question: 'MSA stands for...', options: ['Modern Spoken Arabic', 'Modern Standard Arabic', 'Middle Standard Arabic', 'Main Spoken Arabic'], correct: 'Modern Standard Arabic' },
      { question: 'MSA (الفصحى) is used in...', options: ['Street conversations', 'News and official documents', 'Text messages', 'Local dialects'], correct: 'News and official documents' },
      { question: 'A formal Arabic letter closes with...', options: ['مرحبا', 'يا صديقي', 'مع خالص التحية والتقدير', 'ما شاء الله'], correct: 'مع خالص التحية والتقدير' },
    ], 18),

  makeLesson('ar-culture', 'Cultural Nuances in Arabic', 'Understand the culture behind the language.', 'Arabic', 'Advanced', 'Speaking', 9, 50,
    [
      { title: 'Hospitality & Social Customs', body: 'Arab culture places immense value on hospitality (كرم, karam). Language reflects this deeply.', examples: ['"أهلاً وسهلاً بك" — You are among family. (The warmest welcome.)', '"تفضل/تفضلي" (Tafaddal/Tafaddali) — Please, go ahead / help yourself (used constantly for inviting people)', '"على الرحب والسعة" — With all space and openness. (You\'re very welcome here.)'] },
      { title: 'Expressing Emotions in Arabic', body: 'Arabic has unique words for emotions that don\'t have direct English equivalents.', examples: ['"شوق" (Shawq) — A longing/yearning for someone or something missed.', '"فرح" (Farah) — Deep joy and happiness, often shared.', '"طرب" (Tarab) — The emotional state of being moved by music or beautiful sounds.', '"حنين" (Hanīn) — Nostalgia; the ache of longing for the past.'] },
    ],
    [
      { question: '"تفضل" is used to...', options: ['Say goodbye', 'Express anger', 'Invite someone to go ahead or help themselves', 'Ask for help'], correct: 'Invite someone to go ahead or help themselves' },
      { question: '"حنين" (Hanīn) describes...', options: ['Joy', 'Anger', 'Nostalgia and longing for the past', 'Surprise'], correct: 'Nostalgia and longing for the past' },
      { question: '"كرم" (Karam) means...', options: ['Patience', 'Generosity / Hospitality', 'Wisdom', 'Strength'], correct: 'Generosity / Hospitality' },
    ], 18),

  // ── TURKISH ──────────────────────────────────────────────────────────────

  makeLesson('tr-alphabet', 'Turkish Alphabet & Vowel Harmony', 'Master the foundation of Turkish pronunciation.', 'Turkish', 'Beginner', 'Vocabulary', 1, 20,
    [
      { title: 'The Turkish Alphabet', body: 'Turkish uses the Latin alphabet with 29 letters — the same as English plus some special characters unique to Turkish.', examples: ['Special letters: Ç (ch), Ğ (soft g, lengthens vowel), İ (dotted i), Ö (like German ö), Ş (sh), Ü (like German ü)', 'No letters: Q, W, X (these only appear in foreign loanwords)', 'Every letter is pronounced — Turkish is a very phonetic language!'] },
      { title: 'Vowel Harmony (Vowel Harmony)', body: 'The most important rule in Turkish: suffixes must use vowels that match the last vowel of the word. This affects every suffix in the language.', examples: ['Back vowels (a, ı, o, u) → suffix uses back vowels', 'Front vowels (e, i, ö, ü) → suffix uses front vowels', 'ev (house) + de = evde (in the house) — front vowel', 'araba (car) + da = arabada (in the car) — back vowel'] },
    ],
    [
      { question: 'How many letters are in the Turkish alphabet?', options: ['26', '28', '29', '31'], correct: '29' },
      { question: 'Which letter is unique to Turkish (not in English)?', options: ['A', 'S', 'Ş', 'T'], correct: 'Ş' },
      { question: '"Evde" (in the house) uses front vowels because "ev" contains...', options: ['Back vowel a', 'Front vowel e', 'No vowels', 'Mixed vowels'], correct: 'Front vowel e' },
    ], 10),

  makeLesson('tr-greetings', 'Turkish Greetings & Introductions', 'Greet and introduce yourself in Turkish.', 'Turkish', 'Beginner', 'Speaking', 2, 20,
    [
      { title: 'Core Greetings', body: 'Turkish people are warm and social. Greetings are important and often include asking about wellbeing.', examples: ['Merhaba! — Hello! (universal, any time)', 'Günaydın! — Good morning! (günaydın = good + morning)', 'İyi akşamlar! — Good evening!', 'İyi geceler! — Good night!', 'Nasılsın? — How are you? (informal)', 'Nasılsınız? — How are you? (formal/plural)'] },
      { title: 'Introductions', body: 'Meeting someone new in Turkish is straightforward and warm.', examples: ['Benim adım Ahmet. — My name is Ahmet.', 'Adın ne? — What\'s your name? (informal)', 'Adınız ne? — What\'s your name? (formal)', 'Memnun oldum. — Pleased to meet you.', 'Ben Türküm / Somalyalıyım. — I am Turkish / Somali.'] },
    ],
    [
      { question: '"Merhaba" means...', options: ['Goodbye', 'Good morning', 'Hello', 'Thank you'], correct: 'Hello' },
      { question: '"Nasılsın?" is the informal way to ask...', options: ['What\'s your name?', 'How are you?', 'Where are you from?', 'How old are you?'], correct: 'How are you?' },
      { question: '"Memnun oldum" means...', options: ['Good morning', 'Thank you', 'Pleased to meet you', 'Goodbye'], correct: 'Pleased to meet you' },
    ], 10),

  makeLesson('tr-numbers', 'Turkish Numbers (Sayılar)', 'Count and use numbers in Turkish.', 'Turkish', 'Beginner', 'Vocabulary', 3, 20,
    [
      { title: 'Numbers 1–10', body: 'Turkish numbers 1-10 are root words that form the basis for all larger numbers.', examples: ['1 = bir, 2 = iki, 3 = üç, 4 = dört, 5 = beş', '6 = altı, 7 = yedi, 8 = sekiz, 9 = dokuz, 10 = on'] },
      { title: 'Building Larger Numbers', body: 'Turkish numbers follow a logical pattern. Tens + units are simply placed together.', examples: ['11 = on bir (ten + one)', '20 = yirmi, 30 = otuz, 40 = kırk, 50 = elli', '25 = yirmi beş (twenty + five)', '100 = yüz, 1000 = bin'] },
    ],
    [
      { question: 'How do you say "5" in Turkish?', options: ['dört', 'altı', 'beş', 'yedi'], correct: 'beş' },
      { question: '"Yirmi" means...', options: ['10', '15', '20', '30'], correct: '20' },
      { question: '"On iki" means...', options: ['10', '11', '12', '20'], correct: '12' },
    ], 8),

  makeLesson('tr-shopping', 'Turkish Shopping Phrases', 'Shop and bargain with confidence in Turkish.', 'Turkish', 'Intermediate', 'Speaking', 4, 35,
    [
      { title: 'At the Market (Pazarda)', body: 'Turkish markets (bazaars) are lively places. Knowing these phrases makes shopping enjoyable.', examples: ['Bu ne kadar? — How much is this?', 'Çok pahalı! — It\'s too expensive!', 'İndirim var mı? — Is there a discount?', 'Bunu alıyorum. — I\'ll take this.', 'Başka rengi var mı? — Do you have it in another colour?'] },
      { title: 'Numbers & Payment', body: 'Understanding prices and paying correctly is essential.', examples: ['... lira lütfen. — ... lira please.', 'Bozuk para var mı? — Do you have change?', 'Kredi kartı kabul ediyor musunuz? — Do you accept credit cards?', 'Fiş alabilir miyim? — Can I get a receipt?'] },
    ],
    [
      { question: '"Bu ne kadar?" means...', options: ['I\'ll take this', 'How much is this?', 'Is there a discount?', 'Do you have change?'], correct: 'How much is this?' },
      { question: '"Çok pahalı" means...', options: ['Very cheap', 'Too expensive', 'Good quality', 'I like it'], correct: 'Too expensive' },
      { question: '"İndirim var mı?" means...', options: ['Do you accept cards?', 'Is there a discount?', 'Do you have change?', 'Where is it?'], correct: 'Is there a discount?' },
    ], 12),

  makeLesson('tr-past-tense', 'Turkish Past Tense (-dı/-di)', 'Talk about completed events in Turkish.', 'Turkish', 'Intermediate', 'Grammar', 5, 35,
    [
      { title: 'Definite Past Tense (-dı/-di)', body: 'Used for events you witnessed or experienced directly. The suffix changes based on vowel harmony.', examples: ['gelmek (to come) → geldi (he/she came)', 'yemek (to eat) → yedi (he/she ate)', 'gitmek (to go) → gitti (he/she went)', 'geldim (I came), geldin (you came), geldi (he/she came)', 'geldik (we came), geldiniz (you pl. came), geldiler (they came)'] },
      { title: 'Negative & Question Forms', body: 'Negation and questions are formed with suffixes in Turkish.', examples: ['Geldi (came) → Gelmedi (didn\'t come)', 'Geldi mi? (Did he/she come?) — question with "mi"', 'Gitmedim. — I didn\'t go.', 'Yemek yedin mi? — Did you eat?'] },
    ],
    [
      { question: 'What is the past tense of "gelmek" (to come) for "he"?', options: ['Geliyor', 'Geldim', 'Geldi', 'Gelecek'], correct: 'Geldi' },
      { question: '"Gitmedim" means...', options: ['I went', 'I will go', 'I didn\'t go', 'Go!'], correct: 'I didn\'t go' },
      { question: 'Questions in Turkish past tense use...', options: ['A word at the start', 'The suffix "-mi"', 'A rising tone only', 'The word "soru"'], correct: 'The suffix "-mi"' },
    ], 14),

  makeLesson('tr-travel', 'Getting Around in Turkish', 'Navigate transport and travel in Turkey.', 'Turkish', 'Intermediate', 'Speaking', 6, 35,
    [
      { title: 'Transport & Directions', body: 'Essential phrases for using Turkish public transport and asking for directions.', examples: ['... nerede? — Where is...?', 'Havalimanı nerede? — Where is the airport?', 'Otobüs durağı nerede? — Where is the bus stop?', 'Buradan ne kadar uzaklıkta? — How far from here?', 'Sola/sağa dönün. — Turn left/right.', 'Düz gidin. — Go straight ahead.'] },
      { title: 'Buying Tickets', body: 'At stations, airports, and ticket booths.', examples: ['... için bilet istiyorum. — I want a ticket to...', 'Tek gidiş mi, gidiş-dönüş mü? — One way or return?', 'Bir sonraki tren ne zaman? — When is the next train?', 'Kaçıncı peron? — Which platform?'] },
    ],
    [
      { question: '"Nerede?" means...', options: ['How much?', 'When?', 'Where?', 'What?'], correct: 'Where?' },
      { question: '"Düz gidin" means...', options: ['Turn left', 'Go straight ahead', 'Turn right', 'Go back'], correct: 'Go straight ahead' },
      { question: '"Tek gidiş" means...', options: ['Return ticket', 'First class', 'One way', 'Platform'], correct: 'One way' },
    ], 12),

  makeLesson('tr-idioms', 'Turkish Idioms (Deyimler)', 'Sound native with authentic Turkish expressions.', 'Turkish', 'Advanced', 'Vocabulary', 7, 50,
    [
      { title: 'Everyday Turkish Idioms', body: 'Turkish deyimler (idioms) are colourful, poetic, and very widely used in everyday speech.', examples: ['"Devede kulak" (a camel\'s ear) — a drop in the ocean; something insignificant', '"Ağzı var dili yok" (has a mouth but no tongue) — very shy, doesn\'t speak up', '"Tuz biber ekmek" (to add salt and pepper) — to make a bad situation worse', '"Aklı bir karış havada" (mind is a span in the air) — daydreaming / absent-minded'] },
      { title: 'Proverbs (Atasözleri)', body: 'Turkish proverbs reflect centuries of Anatolian wisdom.', examples: ['"Damlaya damlaya göl olur." — Drop by drop, a lake forms. (Small things add up.)', '"Bir elin nesi var, iki elin sesi var." — One hand has nothing; two hands have a voice. (Teamwork matters.)', '"Sabır acıdır, meyvesi tatlıdır." — Patience is bitter, but its fruit is sweet.'] },
    ],
    [
      { question: '"Devede kulak" idiom means...', options: ['Very loud', 'A drop in the ocean / insignificant', 'Listening carefully', 'A large animal'], correct: 'A drop in the ocean / insignificant' },
      { question: '"Damlaya damlaya göl olur" teaches...', options: ['Water is important', 'Small efforts accumulate into big results', 'Patience is hard', 'Teamwork is key'], correct: 'Small efforts accumulate into big results' },
      { question: '"Sabır acıdır, meyvesi tatlıdır" means...', options: ['Fruit is sweet', 'Patience leads to sweet rewards', 'Bitter food is healthy', 'Wait and see'], correct: 'Patience leads to sweet rewards' },
    ], 18),

  makeLesson('tr-conditional', 'Turkish Conditional Sentences', 'Express "if" scenarios in Turkish.', 'Turkish', 'Advanced', 'Grammar', 8, 50,
    [
      { title: 'Real Conditionals (-sa/-se)', body: 'Used for likely or possible situations — things that could realistically happen.', examples: ['Yağmur yağarsa, evde kalırım. — If it rains, I\'ll stay home.', 'Para kazanırsam, seyahat ederim. — If I earn money, I\'ll travel.', 'Suffix "-sa/-se" attaches to verb stem with vowel harmony.', 'gelmek → gelirse (if he/she comes), gitsem (if I go)'] },
      { title: 'Unreal / Hypothetical Conditionals', body: 'For imaginary or contrary-to-fact situations, Turkish uses the past tense form in the "if" clause.', examples: ['Zengin olsaydım, dünyayı gezerdi. — If I were rich, I would travel the world.', 'Erken kalksaydın, treni kaçırmazdın. — If you had woken up early, you wouldn\'t have missed the train.'] },
    ],
    [
      { question: 'The suffix for real conditionals in Turkish is...', options: ['-dı/-di', '-sa/-se', '-acak/-ecek', '-yor'], correct: '-sa/-se' },
      { question: '"Yağmur yağarsa" means...', options: ['It is raining', 'It rained', 'If it rains', 'It will rain'], correct: 'If it rains' },
      { question: 'Unreal conditionals in Turkish describe...', options: ['Past events', 'Habitual actions', 'Imaginary / contrary-to-fact situations', 'Future certainties'], correct: 'Imaginary / contrary-to-fact situations' },
    ], 18),

  makeLesson('tr-formal', 'Formal Turkish Speech & Writing', 'Master polite and professional Turkish.', 'Turkish', 'Advanced', 'Writing', 9, 50,
    [
      { title: 'Formal vs. Informal Register', body: 'Turkish has two main registers: the informal "sen" form and the formal "siz" form. In professional or older-person interactions, always use "siz."', examples: ['Informal: Ne istiyorsun? — What do you want?', 'Formal: Ne istiyorsunuz? — What do you want? (sir/ma\'am)', 'Informal: Anlıyor musun? — Do you understand?', 'Formal: Anlıyor musunuz? / Anlar mısınız? — Do you understand? (formal)'] },
      { title: 'Business & Professional Phrases', body: 'Key phrases for meetings, emails, and professional correspondence in Turkish.', examples: ['Sayın [İsim/Ünvan], — Dear [Name/Title], (email opener)', 'Toplantımız için teşekkür ederim. — Thank you for our meeting.', 'Bilginize sunarım. — For your information / I bring to your attention.', 'Saygılarımla, — Respectfully / With regards, (email closer)'] },
    ],
    [
      { question: 'In formal Turkish, you use the pronoun...', options: ['Ben', 'Sen', 'Siz', 'O'], correct: 'Siz' },
      { question: '"Sayın" at the start of an email means...', options: ['Hello', 'Dear (formal)', 'Thank you', 'Goodbye'], correct: 'Dear (formal)' },
      { question: '"Saygılarımla" is used to...', options: ['Open a meeting', 'Greet a friend', 'Close a formal email', 'Ask a question'], correct: 'Close a formal email' },
    ], 18),

  // ── SOMALI ───────────────────────────────────────────────────────────────

  makeLesson('so-alphabet', 'Somali Alphabet (Xarfaha)', 'Learn the Somali script and pronunciation.', 'Somali', 'Beginner', 'Vocabulary', 1, 20,
    [
      { title: 'The Somali Alphabet', body: 'Somali uses the Latin alphabet with 21 letters. The modern Somali orthography was officially adopted in 1972. It is very phonetic — almost every letter has one consistent sound.', examples: ['21 letters: B, T, J, X, Kh, D, R, S, Sh, Dh, C, G, F, Q, K, L, M, N, W, H, Y', 'No letters: P, V, Z (these appear only in loanwords)', 'Unique sounds: X (deep h sound, like Arabic خ), C (deep a/e sound from the throat, like Arabic ع), Dh (retroflex d), Q (deep k from throat)'] },
      { title: 'Tones & Vowel Length', body: 'Somali uses vowel length to distinguish meaning. A short "a" and a long "aa" are completely different words.', examples: ['cas = red | caas = mirror', 'bil = month | biil = bill/account', 'Long vowels: aa, ee, ii, oo, uu', 'The letter "C" represents the pharyngeal sound ع — a deep sound from the throat.'] },
    ],
    [
      { question: 'How many letters are in the Somali alphabet?', options: ['19', '21', '26', '28'], correct: '21' },
      { question: 'When was the modern Somali orthography officially adopted?', options: ['1950', '1960', '1972', '1990'], correct: '1972' },
      { question: 'In Somali, "X" represents...', options: ['The English "x" sound', 'A deep "h" sound (like Arabic خ)', 'A silent letter', 'The letter "sh"'], correct: 'A deep "h" sound (like Arabic خ)' },
    ], 10),

  makeLesson('so-greetings', 'Somali Greetings (Salaan)', 'Greet people warmly the Somali way.', 'Somali', 'Beginner', 'Speaking', 2, 20,
    [
      { title: 'Core Greetings', body: 'Somali greetings are warm and often religious in tone, reflecting the Islamic culture of Somalia. They are sincere, not just polite formalities.', examples: ['Assalamu Calaykum — Peace be upon you (standard greeting)', 'Wacalaykum Assalam — And peace be upon you (response)', 'Maalin wanaagsan! — Good day!', 'Subax wanaagsan! — Good morning!', 'Habeyn wanaagsan! — Good night!'] },
      { title: 'How Are You?', body: 'Asking about wellbeing is important in Somali culture. These exchanges are never rushed.', examples: ['Sidee tahay? — How are you? (singular/informal)', 'Sidee tihiin? — How are you? (plural/formal)', 'Waan fiicanahay, mahadsanid. — I am fine, thank you.', 'Nabad iyo nolol. — Peace and life. (A rich, meaningful response)'] },
    ],
    [
      { question: '"Subax wanaagsan" means...', options: ['Good night', 'Good morning', 'Good evening', 'Good day'], correct: 'Good morning' },
      { question: '"Sidee tahay?" means...', options: ['What is your name?', 'How are you?', 'Where are you from?', 'Good morning'], correct: 'How are you?' },
      { question: '"Waan fiicanahay" means...', options: ['I am sad', 'I am fine', 'I am busy', 'I am hungry'], correct: 'I am fine' },
    ], 10),

  makeLesson('so-numbers', 'Somali Numbers (Tirooyin)', 'Count and use numbers in Somali.', 'Somali', 'Beginner', 'Vocabulary', 3, 20,
    [
      { title: 'Numbers 1–10', body: 'Somali number words are unique and must be memorized. They do not share roots with Arabic or English numbers.', examples: ['1 = Kow, 2 = Laba, 3 = Saddex, 4 = Afar, 5 = Shan', '6 = Lix, 7 = Todobo, 8 = Sideed, 9 = Sagaal, 10 = Toban'] },
      { title: 'Counting to 20', body: 'Numbers 11-19 are formed by saying the unit number + "iyo toban" (and ten). 20 = Labaatan.', examples: ['11 = Kow iyo toban (one and ten)', '12 = Laba iyo toban (two and ten)', '15 = Shan iyo toban (five and ten)', '20 = Labaatan | 30 = Soddon | 100 = Boqol'] },
    ],
    [
      { question: 'How do you say "5" in Somali?', options: ['Afar', 'Shan', 'Lix', 'Todobo'], correct: 'Shan' },
      { question: '"Toban" means...', options: ['One', 'Five', 'Ten', 'Twenty'], correct: 'Ten' },
      { question: '"Laba iyo toban" means...', options: ['11', '12', '20', '22'], correct: '12' },
    ], 8),

  makeLesson('so-market', 'Somali Market Conversations', 'Shop and chat at the Somali market (suuq).', 'Somali', 'Intermediate', 'Speaking', 4, 35,
    [
      { title: 'At the Suuq (Market)', body: 'The market (suuq) is central to Somali social life. Bargaining (xagajin) is expected and enjoyed.', examples: ['Immisa baad u gataysaa? — How much are you selling it for?', 'Aad ayay u qaali tahay! — It is very expensive!', 'I dhimee qiimaha. — Reduce the price for me.', 'Waan iibsanayaa. — I will buy it.', 'Ma leedahay midab kale? — Do you have another colour?'] },
      { title: 'Polite Expressions at the Market', body: 'Courtesy is key in Somali commerce.', examples: ['Mahadsanid. — Thank you.', 'Alla barakee. — May God bless you. (after a transaction)', 'Nabad gelyo. — Goodbye / Go in peace.', 'Soo noqo. — Come back again.'] },
    ],
    [
      { question: '"Immisa baad u gataysaa?" means...', options: ['I will buy it', 'How much are you selling it for?', 'It is expensive', 'Do you have change?'], correct: 'How much are you selling it for?' },
      { question: '"Aad ayay u qaali tahay" means...', options: ['It is cheap', 'I like it', 'It is very expensive', 'Good quality'], correct: 'It is very expensive' },
      { question: '"Mahadsanid" means...', options: ['Goodbye', 'Thank you', 'Please', 'Welcome'], correct: 'Thank you' },
    ], 12),

  makeLesson('so-verbs', 'Somali Verb Forms', 'Understand how Somali verbs work.', 'Somali', 'Intermediate', 'Grammar', 5, 35,
    [
      { title: 'Verb Basics', body: 'Somali verbs change based on the subject through personal suffixes. The verb often comes at the end of the sentence (SOV structure: Subject-Object-Verb).', examples: ['Amar wuxuu cunayaa. — Amar is eating. (He + eating)', 'Caasha waxay cabaysaa. — Asha is drinking. (She + drinking)', 'Aniga waan tagayaa. — I am going. (I + going)', 'Sentence order: Subject → Object → Verb'] },
      { title: 'Past & Present Forms', body: 'Somali has a rich tense system. Here are key patterns for past and present tense.', examples: ['Present: waan cunayaa (I am eating)', 'Past: waan cunay (I ate)', 'Future: waan cuni doonnaa (I will eat)', 'Negative present: ma cunayo (I am not eating)', 'Negative past: ma cunin (I did not eat)'] },
    ],
    [
      { question: 'Somali sentence structure is...', options: ['SVO (Subject-Verb-Object)', 'VSO (Verb-Subject-Object)', 'SOV (Subject-Object-Verb)', 'OVS'], correct: 'SOV (Subject-Object-Verb)' },
      { question: '"Waan cunay" means...', options: ['I am eating', 'I ate', 'I will eat', 'I don\'t eat'], correct: 'I ate' },
      { question: '"Ma cunin" means...', options: ['I ate', 'I am eating', 'I did not eat', 'Eat!'], correct: 'I did not eat' },
    ], 14),

  makeLesson('so-travel', 'Somali Travel Phrases', 'Navigate and explore with confidence.', 'Somali', 'Intermediate', 'Speaking', 6, 35,
    [
      { title: 'Asking for Directions', body: 'Essential phrases for navigating Somali cities like Mogadishu, Hargeisa, or Bosaso.', examples: ['Xagee ayaa ... ku yaalla? — Where is...?', 'Sideed ugu tagi kartaa...? — How can you get to...?', 'Xagga midig u jee. — Turn to the right.', 'Xagga bidix u jee. — Turn to the left.', 'Si toos ah u soco. — Go straight.'] },
      { title: 'Transport & Travel', body: 'Useful phrases for buses, taxis, and travel in the Somali context.', examples: ['Gaari baad u baahan tahay? — Do you need a car/taxi?', 'Garoonka diyaaradaha xagee? — Where is the airport?', 'Goormaa baabuurku tagayaa? — When does the bus leave?', 'Lacagta waa immisa? — How much is the fare?'] },
    ],
    [
      { question: '"Xagee ayaa ku yaalla?" means...', options: ['How much is it?', 'When does it leave?', 'Where is it located?', 'Turn right'], correct: 'Where is it located?' },
      { question: '"Xagga midig" means...', options: ['Left', 'Straight', 'Right', 'Behind'], correct: 'Right' },
      { question: '"Lacagta waa immisa?" means...', options: ['Where is the airport?', 'When does the bus leave?', 'How much is the fare?', 'Do you need a taxi?'], correct: 'How much is the fare?' },
    ], 12),

  makeLesson('so-proverbs', 'Somali Proverbs (Maahmaahyo)', 'Speak with the wisdom of Somali tradition.', 'Somali', 'Advanced', 'Vocabulary', 7, 50,
    [
      { title: 'Famous Somali Maahmaahyo', body: 'Maahmaahyo (proverbs) are a pillar of Somali oral culture. Somali is famous as a language of poetry. A well-timed proverb commands great respect.', examples: ['"Nin daran kuma daato" — A bad man does not fear (shame). (Said of shameless people.)', '"Xiddigta aad raacdo waa tan kugu horseedda." — The star you follow is the one that guides you. (Follow your true north/values.)', '"Gacan la\'aani waa indho la\'aan." — The lack of a hand (helping hand) is like the lack of eyes. (Teamwork and help are essential.)'] },
      { title: 'Poetic Wisdom', body: 'Somali proverbs often have beautiful, layered meanings. They capture life lessons in a single sentence.', examples: ['"Nin walba wuxuu jeclahay ayuu ku hadlaa." — Every man speaks of what he loves.', '"Dhimasho la helaa nolol ma leh." — A death that is found has no life. (Some things cannot be escaped.)', '"Samir waa samir, laakiin samir culus baa jira." — Patience is patience, but there is a heavy patience. (Some burdens test us more than others.)'] },
    ],
    [
      { question: '"Gacan la\'aani waa indho la\'aan" teaches...', options: ['Eyes are important', 'Helping others is as essential as sight', 'Independence is key', 'Hands are stronger than eyes'], correct: 'Helping others is as essential as sight' },
      { question: 'What are Somali proverbs called?', options: ['Gabayadda', 'Maahmaahyo', 'Tirooyin', 'Xarfaha'], correct: 'Maahmaahyo' },
      { question: '"Nin walba wuxuu jeclahay ayuu ku hadlaa" means...', options: ['Every man is different', 'Every man speaks of what he loves', 'Speak less, listen more', 'Men are wise'], correct: 'Every man speaks of what he loves' },
    ], 18),

  makeLesson('so-grammar', 'Complex Somali Grammar', 'Master advanced Somali grammatical structures.', 'Somali', 'Advanced', 'Grammar', 8, 50,
    [
      { title: 'Focus Particles', body: 'Somali has a unique "focus" system — words change depending on what information is being emphasized in the sentence. This is one of Somali\'s most distinctive features.', examples: ['Amar baa tegay. — AMAR went. (Focus on Amar)', 'Amar wuxuu tegay. — Amar WENT. (Focus on going)', 'Xaggee buu tegay? — Where did he go? (Focus on destination)', 'The focus particle (baa, ayaa, waxaa) shifts the emphasis.'] },
      { title: 'Nominal Classes', body: 'Somali nouns are divided into masculine and feminine classes, which affect agreement with verbs, adjectives, and pronouns.', examples: ['Masculine: wiil (boy), aqoon (knowledge), beri (day)', 'Feminine: gabar (girl), magaalo (city), shaah (tea)', 'Gender affects definite article: -ka (masc.) / -ta (fem.)', 'wiilka (the boy) vs. gabadha (the girl)'] },
    ],
    [
      { question: 'What is unique about Somali\'s "focus" system?', options: ['Verbs change by tense', 'Words change based on what is being emphasized', 'Nouns have no gender', 'All sentences start with a verb'], correct: 'Words change based on what is being emphasized' },
      { question: '"Wiilka" means...', options: ['A boy (indefinite)', 'The boy (definite masculine)', 'Boys', 'His boy'], correct: 'The boy (definite masculine)' },
      { question: 'The focus particle "baa" in "Amar baa tegay" emphasizes...', options: ['The action of going', 'The time of going', 'AMAR (the subject)', 'The destination'], correct: 'AMAR (the subject)' },
    ], 20),

  makeLesson('so-culture', 'Somali Cultural Expressions', 'Connect deeply through Somali cultural language.', 'Somali', 'Advanced', 'Speaking', 9, 50,
    [
      { title: 'Poetry & Language', body: 'Somali is considered one of the great oral poetry languages in the world. The Gabay is the highest form of Somali poetry. Mastering cultural expressions shows deep respect.', examples: ['"Hablaha Soomalida waa ubax furan" — Somali women are like an open flower. (Poetic praise.)', '"Aqoontaada waa hantidaada" — Your knowledge is your wealth.', '"Waxbarashadu waa iftiin" — Education is light.', '"Shaqada waa barakaysan tahay" — Work is blessed.'] },
      { title: 'Blessings & Social Language', body: 'Somali culture is rich with blessings (ducooyinka). These are used generously in daily life.', examples: ['"Ilaahay kaa barakeeyo!" — May God bless you!', '"Ilaahay ku siiyo nabad." — May God give you peace.', '"Aad baad u mahadsantahay." — You are very much thanked.', '"Nabad gelyo." — Go in peace. (Farewell)'] },
    ],
    [
      { question: '"Aqoontaada waa hantidaada" means...', options: ['Work is blessed', 'Education is light', 'Your knowledge is your wealth', 'Women are like flowers'], correct: 'Your knowledge is your wealth' },
      { question: 'The highest form of Somali poetry is called...', options: ['Maahmaah', 'Tirooyin', 'Gabay', 'Suuq'], correct: 'Gabay' },
      { question: '"Ilaahay kaa barakeeyo!" means...', options: ['Go in peace', 'Thank you very much', 'May God bless you', 'Good morning'], correct: 'May God bless you' },
    ], 20),
];

const insertLesson = db.prepare(`INSERT OR IGNORE INTO lessons (id,title,description,language,level,type,display_order,xp_reward,content,quiz_data,duration_minutes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const seedLessons = db.transaction(() => CURRICULUM.forEach((row) => insertLesson.run(...row)));
seedLessons();

const insertAchievement = db.prepare('INSERT OR IGNORE INTO achievements (id,title,description,type,requirement_value) VALUES (?,?,?,?,?)');
[
  ['first-step', 'First Step', 'Complete your first lesson.', 'lessons', 1],
  ['xp-100', 'Century Club', 'Earn 100 XP.', 'xp', 100],
  ['xp-500', 'XP Champion', 'Earn 500 XP.', 'xp', 500],
  ['polyglot', 'Four Voices', 'Learn in all four languages.', 'language', 4],
  ['dedicated', 'Dedicated Learner', 'Complete 10 lessons.', 'lessons', 10],
  ['master', 'Language Master', 'Complete 25 lessons.', 'lessons', 25],
].forEach((row) => insertAchievement.run(...row));

// ─── SMART PHRASE-LOOKUP TRANSLATION ENGINE ───────────────────────────────
// A curated bilingual dictionary for natural, context-aware offline translation.

const LANG_CODES = { English: 'en', Arabic: 'ar', Turkish: 'tr', Somali: 'so' };

// Each entry: { en, ar, tr, so, example, tip }
const PHRASE_DICTIONARY = [
  { en: 'hello', ar: 'مرحبا', tr: 'merhaba', so: 'salaan', example: 'Hello, how are you?', tip: 'One of the most universal greetings across all four languages.' },
  { en: 'goodbye', ar: 'مع السلامة', tr: 'güle güle', so: 'nabad gelyo', example: 'Goodbye, see you tomorrow!', tip: 'Turkish "güle güle" (go smiling) is said by the one staying; departing says "hoşça kal".' },
  { en: 'thank you', ar: 'شكراً', tr: 'teşekkür ederim', so: 'mahadsanid', example: 'Thank you for your help.', tip: 'In Arabic you can intensify it: "شكراً جزيلاً" (shukran jazilan).' },
  { en: 'please', ar: 'من فضلك', tr: 'lütfen', so: 'fadlan', example: 'Could you help me, please?', tip: 'Arabic "من فضلك" literally means "from your grace/favour".' },
  { en: 'yes', ar: 'نعم', tr: 'evet', so: 'haa', example: 'Yes, I understand.', tip: 'In colloquial Arabic, "aywa" (آيوا) is more common than "na\'am" in everyday speech.' },
  { en: 'no', ar: 'لا', tr: 'hayır', so: 'maya', example: 'No, thank you.', tip: 'Somali "maya" is a strong no; "haa" confirms. Very clear and direct.' },
  { en: 'good morning', ar: 'صباح الخير', tr: 'günaydın', so: 'subax wanaagsan', example: 'Good morning! How did you sleep?', tip: 'The Arabic response to "sabah al-khayr" is "sabah an-noor" (morning of light).' },
  { en: 'good night', ar: 'تصبح على خير', tr: 'iyi geceler', so: 'habeyn wanaagsan', example: 'Good night! Sleep well.', tip: 'Arabic response: "wa anta/anti min ahluhu" (and may you be of its people).' },
  { en: 'how are you', ar: 'كيف حالك', tr: 'nasılsın', so: 'sidee tahay', example: 'Hi! How are you doing?', tip: 'Somali "sidee tahay" is singular; use "sidee tihiin" for plural/formal.' },
  { en: 'i am fine', ar: 'أنا بخير', tr: 'iyiyim', so: 'waan fiicanahay', example: 'I am fine, thank you for asking.', tip: 'A richer Somali response is "nabad iyo nolol" (peace and life).' },
  { en: 'what is your name', ar: 'ما اسمك', tr: 'adın ne', so: 'magacaagu waa maxay', example: 'Nice to meet you! What is your name?', tip: 'Turkish formal version: "adınız ne?" (with the polite "siz" form).' },
  { en: 'my name is', ar: 'اسمي', tr: 'benim adım', so: 'magacaygu waa', example: 'My name is Ibrahim.', tip: 'All four languages use a possessive + name pattern for this introduction.' },
  { en: 'where are you from', ar: 'من أين أنت', tr: 'nerelisin', so: 'xageebaa ka timaadaa', example: 'Where are you from originally?', tip: 'Turkish "nerelisin" compresses "where" + "are you from" into one word.' },
  { en: 'i love you', ar: 'أحبك', tr: 'seni seviyorum', so: 'waan ku jeclahay', example: 'I love you more than words can say.', tip: 'Turkish "seni seviyorum" is the most common; "seni çok seviyorum" means "I love you very much".' },
  { en: 'sorry', ar: 'آسف', tr: 'üzgünüm', so: 'raali noqo', example: 'I am sorry for being late.', tip: '"Excuse me" to get attention in Arabic is "min fadlik" or "afwan".' },
  { en: 'excuse me', ar: 'عفواً', tr: 'pardon', so: 'iga raali noqo', example: 'Excuse me, can you help me?', tip: 'Arabic "afwan" serves double duty: both "excuse me" and "you\'re welcome".' },
  { en: 'i do not understand', ar: 'لا أفهم', tr: 'anlamıyorum', so: 'ma fahamno', example: 'I do not understand, can you repeat that?', tip: 'Follow up with "could you speak more slowly?" in any language to help comprehension.' },
  { en: 'speak slowly', ar: 'تكلم ببطء', tr: 'yavaş konuş', so: 'si gaaban u hadal', example: 'Please speak slowly, I am learning.', tip: 'A learner\'s best tool! Never be afraid to ask this.' },
  { en: 'water', ar: 'ماء', tr: 'su', so: 'biyo', example: 'Can I have a glass of water, please?', tip: 'Arabic "ma\'" is a root word — "miya" (water source), "miyah" (waters) all come from it.' },
  { en: 'food', ar: 'طعام', tr: 'yemek', so: 'cunto', example: 'The food here is delicious.', tip: 'Turkish "yemek" means both "food" and "to eat" depending on context.' },
  { en: 'house', ar: 'بيت', tr: 'ev', so: 'guri', example: 'This is my house.', tip: '"Bayt" (Arabic) appears in many place names: Bayt Lahm = Bethlehem (House of Meat).' },
  { en: 'family', ar: 'عائلة', tr: 'aile', so: 'qoys', example: 'My family is very important to me.', tip: 'Somali culture is deeply clan-based; "qabil" (clan) is also an important family concept.' },
  { en: 'friend', ar: 'صديق', tr: 'arkadaş', so: 'saaxiib', example: 'He is my best friend.', tip: 'Turkish "arkadaş" comes from "arka" (back) — a companion who has your back.' },
  { en: 'money', ar: 'مال', tr: 'para', so: 'lacag', example: 'I need some money for the journey.', tip: 'Turkish "para" comes from the Ottoman/Persian word for money, also found in other languages.' },
  { en: 'school', ar: 'مدرسة', tr: 'okul', so: 'dugsi', example: 'The children go to school every morning.', tip: 'Arabic "madrasa" is found in many world languages as a loanword (madrasah).' },
  { en: 'work', ar: 'عمل', tr: 'iş', so: 'shaqo', example: 'I have a lot of work to do today.', tip: 'Turkish "iş" is very short — it\'s one of the most common words in the language.' },
  { en: 'beautiful', ar: 'جميل', tr: 'güzel', so: 'qurux badan', example: 'What a beautiful view!', tip: 'Turkish "güzel" is very versatile: it means beautiful, nice, good, fine.' },
  { en: 'big', ar: 'كبير', tr: 'büyük', so: 'weyn', example: 'This is a very big city.', tip: 'Somali "weyn" also means old (respected) in some contexts, like "odayga weyn" (the elder).' },
  { en: 'small', ar: 'صغير', tr: 'küçük', so: 'yar', example: 'I prefer a small cup of coffee.', tip: 'Somali "yar" also means a little/a bit: "yar yar" = little by little.' },
  { en: 'time', ar: 'وقت', tr: 'zaman', so: 'waqti', example: 'What time is it now?', tip: 'Somali "waqti" is borrowed from Arabic "waqt" — a sign of the deep historical connection.' },
  { en: 'today', ar: 'اليوم', tr: 'bugün', so: 'maanta', example: 'What are you doing today?', tip: 'Arabic "al-yawm" literally means "the day" — used as "today" in context.' },
  { en: 'tomorrow', ar: 'غداً', tr: 'yarın', so: 'berri', example: 'I will see you tomorrow.', tip: 'Somali "berri" can also mean "outside" depending on context and tone — Somali is tonal!' },
  { en: 'good', ar: 'جيد', tr: 'iyi', so: 'wanaagsan', example: 'That is a very good idea.', tip: '"Wanaagsan" in Somali literally means "having goodness/quality" — a rich word.' },
  { en: 'bad', ar: 'سيء', tr: 'kötü', so: 'xun', example: 'That was a bad decision.', tip: 'In Somali "xun" is strongly negative. Use carefully.' },
  { en: 'hot', ar: 'حار', tr: 'sıcak', so: 'kulul', example: 'It is very hot today.', tip: 'Turkish "sıcak" means both hot (weather/temperature) and warm (emotionally close to someone).' },
  { en: 'cold', ar: 'بارد', tr: 'soğuk', so: 'qabow', example: 'The weather is cold today.', tip: 'Somali "qabow" — Somalia\'s coastal climate means this word is less commonly needed!' },
  { en: 'eat', ar: 'أكل', tr: 'yemek', so: 'cunid', example: 'Let us eat together.', tip: 'Arabic root ا-ك-ل (a-k-l): akala (he ate), ta\'aam (food), ma\'kala (place of eating/restaurant).' },
  { en: 'drink', ar: 'شرب', tr: 'içmek', so: 'cabbid', example: 'Would you like to drink some tea?', tip: 'Tea (shaah in Somali, chai/شاي in Arabic) is central to all four cultures.' },
  { en: 'go', ar: 'ذهب', tr: 'gitmek', so: 'tag', example: 'Let\'s go to the market.', tip: 'Somali "tag" is one of the shortest but most used verbs in the language.' },
  { en: 'come', ar: 'تعال', tr: 'gelmek', so: 'kaalay', example: 'Come here, please.', tip: 'Somali "kaalay" is a command form; "yimaad" is the verb stem meaning "to come".' },
  { en: 'help', ar: 'مساعدة', tr: 'yardım', so: 'caawimo', example: 'Can you help me find this address?', tip: 'In Arabic culture, offering help before being asked ("tafaddal") is considered very generous.' },
  { en: 'love', ar: 'حب', tr: 'sevgi', so: 'jacayl', example: 'Love is the foundation of every family.', tip: 'Somali "jacayl" is the noun; "waan ku jeclahay" (I love you) uses the adjectival verb form.' },
  { en: 'peace', ar: 'سلام', tr: 'barış', so: 'nabad', example: 'We all wish for peace.', tip: '"Nabad" is arguably the most important word in Somali culture — it appears in countless greetings and blessings.' },
  { en: 'book', ar: 'كتاب', tr: 'kitap', so: 'buug', example: 'I am reading an interesting book.', tip: 'Arabic "kitāb" (كتاب) gave us "kitap" in Turkish — a direct loanword preserved over centuries.' },
  { en: 'language', ar: 'لغة', tr: 'dil', so: 'luqad', example: 'Learning a new language opens doors.', tip: 'Turkish "dil" also means tongue — the organ of speech. Language and tongue are the same word!' },
];

function smartTranslate(text, from, to) {
  const fromCode = LANG_CODES[from];
  const toCode = LANG_CODES[to];
  const normalized = text.trim().toLowerCase();

  // 1. Try exact phrase match
  for (const entry of PHRASE_DICTIONARY) {
    if (entry[fromCode] && entry[fromCode].toLowerCase() === normalized) {
      const translation = entry[toCode];
      if (translation) {
        return {
          translation,
          pronunciation: '',
          example_sentence: entry.example || '',
          example_translation: '',
          memory_tip: entry.tip || `"${entry.en}" has a unique expression in ${to}. Try using it in a sentence!`,
        };
      }
    }
  }

  // 2. Try partial/word-level match (first matching word in input)
  const words = normalized.split(/\s+/);
  for (const word of words) {
    for (const entry of PHRASE_DICTIONARY) {
      if (entry[fromCode] && entry[fromCode].toLowerCase() === word) {
        const translation = entry[toCode];
        if (translation) {
          return {
            translation: text.replace(new RegExp(word, 'i'), translation),
            pronunciation: '',
            example_sentence: entry.example || '',
            example_translation: '',
            memory_tip: `Partial match on "${word}" → "${translation}". For a full translation, connect a LibreTranslate API in settings.`,
          };
        }
      }
    }
  }

  // 3. Natural fallback — helpful, not ugly
  const nativeName = { English: 'English', Arabic: 'العربية', Turkish: 'Türkçe', Somali: 'Af Soomaali' };
  return {
    translation: text,
    pronunciation: '',
    example_sentence: '',
    example_translation: '',
    memory_tip: `This phrase isn't in our built-in dictionary yet. The original text is shown. To unlock full AI translation, connect a LibreTranslate-compatible API via the TRANSLATION_API_URL environment variable.`,
  };
}

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

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'SomSpeak' }));
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
async function deliverResetEmail(email, link) { if (process.env.RESET_EMAIL_WEBHOOK_URL) { const response = await fetch(process.env.RESET_EMAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.RESET_EMAIL_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.RESET_EMAIL_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify({ to: email, subject: 'Reset your SomSpeak password', text: `Reset your password: ${link}`, resetUrl: link }), signal: AbortSignal.timeout(10000) }); if (!response.ok) console.error('Password reset email provider failed:', response.status); } else if (process.env.NODE_ENV !== 'production') console.info(`[SomSpeak password reset] ${link}`); else console.error('RESET_EMAIL_WEBHOOK_URL is not configured; password reset email was not delivered.'); }
app.post('/api/auth/reset-password', rateLimit(5, 60 * 60 * 1000), async (req, res) => {
  const { token, newPassword } = req.body || {}; if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 10) return res.status(400).json({ error: 'Invalid reset request.' });
  const hash = crypto.createHash('sha256').update(token).digest('hex'); const reset = db.prepare("SELECT * FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at > datetime('now')").get(hash); if (!reset) return res.status(400).json({ error: 'This reset link is invalid or expired.' });
  db.transaction(() => { db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 12), reset.user_id); db.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE id=?").run(reset.id); })(); res.status(204).end();
});

app.get('/api/lessons', requireAuth, (req, res) => { const params = []; let sql = 'SELECT * FROM lessons'; if (req.query.language) { sql += ' WHERE language=?'; params.push(req.query.language); } sql += ' ORDER BY display_order'; res.json(db.prepare(sql).all(...params).map(lessonShape)); });
app.get('/api/courses', requireAuth, (_req, res) => res.json(db.prepare('SELECT * FROM lessons ORDER BY display_order').all().map(lessonShape)));
app.get('/api/lessons/:id', requireAuth, (req, res) => { const row = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id); if (!row) return res.status(404).json({ error: 'Lesson not found.' }); res.json(lessonShape(row)); });
function lessonShape(row) { return { ...row, order: row.display_order }; }
app.get('/api/achievements', requireAuth, (_req, res) => res.json(db.prepare('SELECT * FROM achievements').all()));
app.get('/api/progress', requireAuth, (req, res) => res.json(db.prepare('SELECT lesson_id,language,completed,score,xp_earned,completed_date FROM user_progress WHERE user_id=? ORDER BY completed_date DESC').all(req.user.id).map((row) => ({ ...row, completed: Boolean(row.completed) }))));
app.put('/api/progress/:lessonId', requireAuth, (req, res) => { const lesson = db.prepare('SELECT id,language,xp_reward FROM lessons WHERE id=?').get(req.params.lessonId); if (!lesson) return res.status(404).json({ error: 'Lesson not found.' }); const score = Number(req.body?.score); if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ error: 'Score must be between 0 and 100.' }); const xp = Math.round((score / 100) * lesson.xp_reward); db.prepare(`INSERT INTO user_progress (user_id,lesson_id,language,completed,score,xp_earned,completed_date) VALUES (?,?,?,1,?,?,datetime('now')) ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed=1,score=MAX(score,excluded.score),xp_earned=MAX(xp_earned,excluded.xp_earned),completed_date=excluded.completed_date`).run(req.user.id, lesson.id, lesson.language, score, xp); res.json({ lesson_id: lesson.id, language: lesson.language, completed: true, score, xp_earned: xp }); });
app.get('/api/profile', requireAuth, (req, res) => { const row = db.prepare('SELECT u.email,u.full_name,u.created_at,p.dark_mode,p.preferred_language,p.daily_goal,p.notifications_enabled FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=?').get(req.user.id); res.json({ ...row, dark_mode: Boolean(row.dark_mode), notifications_enabled: Boolean(row.notifications_enabled) }); });
app.patch('/api/profile', requireAuth, (req, res) => { const { full_name, dark_mode, preferred_language, daily_goal, notifications_enabled } = req.body || {}; if (full_name !== undefined) db.prepare('UPDATE users SET full_name=? WHERE id=?').run(String(full_name).slice(0, 100).trim(), req.user.id); if (dark_mode !== undefined) db.prepare('UPDATE profiles SET dark_mode=? WHERE user_id=?').run(dark_mode ? 1 : 0, req.user.id); if (notifications_enabled !== undefined) db.prepare('UPDATE profiles SET notifications_enabled=? WHERE user_id=?').run(notifications_enabled ? 1 : 0, req.user.id); if (preferred_language !== undefined && ['English', 'Arabic', 'Turkish', 'Somali'].includes(preferred_language)) db.prepare('UPDATE profiles SET preferred_language=? WHERE user_id=?').run(preferred_language, req.user.id); if (daily_goal !== undefined && Number.isInteger(daily_goal) && daily_goal >= 1 && daily_goal <= 20) db.prepare('UPDATE profiles SET daily_goal=? WHERE user_id=?').run(daily_goal, req.user.id); res.json({ updated: true }); });

// ─── TRANSLATE ENDPOINT (enhanced) ───────────────────────────────────────────
app.post('/api/translate', requireAuth, rateLimit(30, 60 * 1000), async (req, res) => {
  const { text, from, to } = req.body || {};
  const SUPPORTED = ['English', 'Arabic', 'Turkish', 'Somali'];

  // Strict input validation
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Please provide text to translate.' });
  const trimmed = text.trim();
  if (!trimmed) return res.status(400).json({ error: 'Text cannot be empty.' });
  if (trimmed.length > 500) return res.status(400).json({ error: 'Text is too long. Maximum 500 characters.' });
  if (!SUPPORTED.includes(from)) return res.status(400).json({ error: `Source language "${from}" is not supported. Choose from: ${SUPPORTED.join(', ')}.` });
  if (!SUPPORTED.includes(to)) return res.status(400).json({ error: `Target language "${to}" is not supported. Choose from: ${SUPPORTED.join(', ')}.` });
  if (from === to) return res.status(400).json({ error: 'Source and target languages must be different.' });

  try {
    // Try external API first if configured
    if (process.env.TRANSLATION_API_URL) {
      const result = await translateViaApi(trimmed, from, to);
      return res.json(result);
    }
    // Fall back to smart phrase lookup
    const result = smartTranslate(trimmed, from, to);
    res.json(result);
  } catch (error) {
    console.error('Translation error:', error.message);
    // Graceful degradation — still return smart lookup result
    const result = smartTranslate(trimmed, from, to);
    res.json(result);
  }
});

async function translateViaApi(text, from, to) {
  const languages = { English: 'en', Arabic: 'ar', Turkish: 'tr', Somali: 'so' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(process.env.TRANSLATION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.TRANSLATION_API_KEY ? { Authorization: `Bearer ${process.env.TRANSLATION_API_KEY}` } : {}) },
      body: JSON.stringify({ q: text, source: languages[from], target: languages[to], format: 'text' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Translation API responded with status ${response.status}`);
    const data = await response.json();
    const translation = data.translatedText || data.translation || text;
    return { translation, pronunciation: '', example_sentence: '', example_translation: '', memory_tip: 'Repeat the translation aloud, then use it in a short sentence.' };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production' || Boolean(process.env.RAILWAY_STATIC_URL);
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath, { index: false }));
  app.get(/^\/(?!api\/|assets\/|manifest\.json|favicon\.ico|.*\.[a-zA-Z0-9]+$).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Unexpected server error.' }); });

if (require.main === module) app.listen(PORT, () => console.log(`SomSpeak API running at http://localhost:${PORT}`));
module.exports = { app, db };
