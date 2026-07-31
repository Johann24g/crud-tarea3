const express = require('express');
const db = require('../db');
const { validateUserInput } = require('../middleware/validate');
const { requireLogin } = require('../middleware/auth');
const { formatDate } = require('../utils/dateFormat');

const router = express.Router();


router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const user = db.prepare('SELECT id, name, email, password FROM users WHERE email = ?').get(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, email: user.email });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Sesión cerrada' });
  });
});


router.post('/', validateUserInput, (req, res) => {
  const { name, email, password } = req.body;
  const createdAt = new Date().toISOString();

  try {
    const stmt = db.prepare(
      'INSERT INTO users (name, email, password, createdAt) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(name, email, password, createdAt);
    res.status(201).json({ id: result.lastInsertRowid, name, email, createdAt: formatDate(createdAt) });
  } catch (err) {
    res.status(400).json({ error: 'No se pudo crear el usuario (¿email duplicado?)' });
  }
});


router.get('/', requireLogin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, createdAt FROM users').all();
  const formatted = users.map(u => ({ ...u, createdAt: formatDate(u.createdAt) }));
  res.json(formatted);
});


router.get('/:id', requireLogin, (req, res) => {
  const user = db.prepare('SELECT id, name, email, createdAt FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ...user, createdAt: formatDate(user.createdAt) });
});


router.put('/:id', requireLogin, (req, res) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres.');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('El email no tiene un formato válido.');
  }
  if (password && password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres.');
  }
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const existing = db.prepare('SELECT password FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

  const finalPassword = password && password.length > 0 ? password : existing.password;

  const stmt = db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?');
  stmt.run(name, email, finalPassword, req.params.id);

  res.json({ message: 'Usuario actualizado' });
});

router.delete('/:id', requireLogin, (req, res) => {
  db.prepare('DELETE FROM payments WHERE userId = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ message: 'Usuario eliminado' });
});

module.exports = router;
