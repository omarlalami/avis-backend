const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sanitizeHtml = require('sanitize-html');

// Clé secrète à stocker en variable d'environnement dans un vrai projet
//const JWT_SECRET = 'mon_super_secret_token';
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
  const db = req.app.locals.db;

  // 🧼 Nettoyage XSS
  const email = sanitizeHtml(req.body.email || '', { allowedTags: [], allowedAttributes: {} }).trim();
  const password = sanitizeHtml(req.body.password || '', { allowedTags: [], allowedAttributes: {} });

  // ➕ AJOUTONS LES CONTRÔLES
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Format d'email invalide." });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM professionals WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '10h' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.post('/register', async (req, res) => {
  const db = req.app.locals.db;

  // 🧼 Nettoyage XSS
  const email = sanitizeHtml(req.body.email || '', { allowedTags: [], allowedAttributes: {} }).trim();
  // Vérification de la présence des champs
  const password = sanitizeHtml(req.body.password || '', { allowedTags: [], allowedAttributes: {} });
  
  // Vérification de la présence des champs
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }
  // Vérification du format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Format d'email invalide." });
  }
  // Vérification de la longueur du mot de passe
  if (password.length < 6) {
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      'INSERT INTO professionals (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );

    res.status(201).json({ message: 'Inscription réussie ✅' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    console.error('Erreur inscription :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
