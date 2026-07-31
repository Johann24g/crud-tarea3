

const express = require('express');
const db = require('../db');
const { formatDate } = require('../utils/dateFormat');

const router = express.Router();

function fakePaymentGateway(amount) {
 
  if (amount <= 0) return { success: false, reason: 'Monto inválido' };
  return { success: true, transactionId: `TX-${Date.now()}` };
}

router.post('/', (req, res) => {
  const { userId, amount } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const gatewayResponse = fakePaymentGateway(amount);
  const status = gatewayResponse.success ? 'completado' : 'rechazado';
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(
    'INSERT INTO payments (userId, amount, status, createdAt) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(userId, amount, status, createdAt);

  res.status(gatewayResponse.success ? 201 : 400).json({
    id: result.lastInsertRowid,
    status,
    transactionId: gatewayResponse.transactionId || null,
    createdAt: formatDate(createdAt)
  });
});

router.get('/user/:userId', (req, res) => {
  const payments = db.prepare('SELECT * FROM payments WHERE userId = ?').all(req.params.userId);
  const formatted = payments.map(p => ({ ...p, createdAt: formatDate(p.createdAt) }));
  res.json(formatted);
});

module.exports = router;
