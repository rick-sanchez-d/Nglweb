const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve HTML, CSS, JS
app.use(express.static(__dirname));
app.use(express.json());

const USERS_FILE = path.join(__dirname, 'users.json');

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data || '[]');
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Signup route
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  users.push({ username, password });
  saveUsers(users);
  return res.json({ success: true });
});

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();

  const found = users.find(u => u.username === username && u.password === password);
  if (!found) return res.status(401).json({ error: 'Invalid login' });

  return res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
