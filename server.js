const express = require('express');
const session = require('express-session');
const path = require('path');

const usersRouter = require('./routes/users');
const paymentsRouter = require('./routes/payments');
const { requireLogin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5007;

app.use(express.json());
app.use(session({
  secret: 'clave-secreta-tarea3-git-flow',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 }
}));


app.get('/dashboard.html', (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/users', usersRouter);
app.use('/api/payments', requireLogin, paymentsRouter);

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/dashboard.html' : '/login.html');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
