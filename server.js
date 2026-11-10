// server.js -- the CampusEats Catalogue REST API, now SECURED
// Node + Express + JWT (jsonwebtoken) + bcrypt (bcryptjs)
//
//   Authentication  -> "who are you?"      -> 401 if we can't tell
//   Authorization   -> "are you allowed?"  -> 403 if you may not
//   Validation      -> "is the data clean?" -> 422 if not
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());                                   // read JSON request bodies
app.use(express.static(path.join(__dirname, 'public')));   // serve the web page (the page itself is public, the API is not)

// ---------------------------------------------------------------- config
// Real life: the secret lives in an environment variable / .env file, never in code.
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET) {
  console.warn('[warn] JWT_SECRET not set -- using the insecure dev secret. Fine for the lab, never for production.');
}

// ---------------------------------------------------------------- users
// Passwords are hashed ONCE at startup and never stored in plain text.
// (a real app keeps users in a database -- Lecture 10)
const users = [
  { id: 1, email: 'asha@campus.edu',    role: 'customer',   hash: bcrypt.hashSync('customer123', 10) },
  { id: 2, email: 'mealhub@campus.edu', role: 'restaurant', hash: bcrypt.hashSync('resto123', 10) },
];

// ---------------------------------------------------------------- data
// the menu -- in memory for now (a real database comes in Lecture 10)
let items = [
  { id: 1, name: 'Veg Thali',   price: 90, veg: true },
  { id: 2, name: 'Paneer Roll', price: 70, veg: true },
];
let nextId = 3;

// ---------------------------------------------------------------- middleware
// authentication -- verify the token (who are you?)
function auth(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');                // "Bearer <token>"
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'invalid or missing token' });
  }
  try {
    req.user = jwt.verify(token, SECRET);                   // checks signature AND expiry
    next();                                                 // ok -> carry on
  } catch {
    res.status(401).json({ error: 'invalid or missing token' });
  }
}

// authorization -- require one of the allowed roles (are you allowed?)
function requireRole(...allowed) {
  return (req, res, next) =>
    allowed.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });
}

// ---------------------------------------------------------------- routes
// POST /login -- verify the password, hand back a JWT
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(422).json({ error: 'email and password required' });
  }
  const user = users.find(u => u.email === email);
  // same message for "no such user" and "wrong password" -- don't reveal which one failed
  if (!user || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: 'bad login' });
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '1h' });
  res.json({ token, role: user.role, email: user.email });
});

// GET /items -- any authenticated user may read the menu (optional filter: /items?veg=true)
app.get('/items', auth, (req, res) => {
  if (req.query.veg === 'true')  return res.json(items.filter(i => i.veg));
  if (req.query.veg === 'false') return res.json(items.filter(i => !i.veg));
  res.json(items);
});

// GET /items/:id -- any authenticated user may read one dish, or 404
app.get('/items/:id', auth, (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

// POST /items -- only a restaurant (or admin) may add a dish
app.post('/items', auth, requireRole('restaurant', 'admin'), (req, res) => {
  const { name, price, veg } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(422).json({ error: 'name required' });
  }
  const p = price === undefined || price === '' ? 0 : Number(price);
  if (!Number.isFinite(p) || p < 0) {
    return res.status(422).json({ error: 'price must be a number, 0 or more' });
  }
  const item = { id: nextId++, name: name.trim(), price: p, veg: veg !== false };
  items.push(item);
  res.status(201).json(item);
});

// DELETE /items/:id -- only a restaurant (or admin) may remove a dish; 204 on success, 404 if missing
app.delete('/items/:id', auth, requireRole('restaurant', 'admin'), (req, res) => {
  const idx = items.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  items.splice(idx, 1);
  res.status(204).end();
});

// ---------------------------------------------------------------- errors
// unknown API route -> JSON 404 (instead of Express's HTML page)
app.use((req, res) => res.status(404).json({ error: 'not found' }));

// malformed JSON body etc. -> JSON error
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'server error' });
});

app.listen(PORT, () => console.log(`Secured Catalogue on http://localhost:${PORT}`));
