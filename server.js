const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const session = require('express-session');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json());

app.use(session({
  secret: 'your_secret_key', // change this in real app
  resave: false,
  saveUninitialized: true
}));

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// === Ensure users table exists ===
const createTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profile_pic_url TEXT
    );
  `);
};
createTable();

// === SIGNUP ===
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'User already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// === LOGIN ===
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1 AND password=$2', [username, password]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid login' });

    const user = result.rows[0];
    req.session.userId = user.id; // Save login session
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// === SETUP PROFILE ===
app.post('/setup-profile', async (req, res) => {
  const { username, imageUrl } = req.body;
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  try {
    // Check for unique username (if updating it)
    const check = await pool.query('SELECT * FROM users WHERE username=$1 AND id <> $2', [username, userId]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    await pool.query(
      'UPDATE users SET username=$1, profile_pic_url=$2 WHERE id=$3',
      [username, imageUrl, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === GET LOGGED IN PROFILE ===
app.get('/me', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  try {
    const result = await pool.query(
      'SELECT username, profile_pic_url FROM users WHERE id = $1',
      [userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// === LOGOUT ===
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.sendStatus(200));
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
