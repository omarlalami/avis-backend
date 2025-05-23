const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const sanitizeHtml = require('sanitize-html');

function anonymizeEmail(email) {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0]}`;
  }

  const first = localPart[0];
  const last = localPart[localPart.length - 1];
  return `${first}***${last}`;
}

// GET /api/avis/:phone
router.get('/:phone', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const phone = sanitizeHtml(req.params.phone, { allowedTags: [], allowedAttributes: {} }).trim();

  const phoneRegex = /^[0-9]{6,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    return res.status(400).json({ message: "Numéro de téléphone invalide. Utilisez uniquement des chiffres (6 à 15 chiffres)." });
  }

  try {
    // Vérifier si le client existe
    const [clientRows] = await db.execute('SELECT * FROM clients WHERE phone = ?', [phone]);

    if (clientRows.length === 0) {
      return res.status(404).json({ message: 'Aucun avis trouvé pour ce numéro.' });
    }

    // Récupérer les avis liés à ce client
    const [avisRows] = await db.execute(
      `SELECT a.is_positive, a.message, a.created_at, p.email AS professional_email
       FROM avis a
       JOIN professionals p ON a.professional_id = p.id
       WHERE a.client_phone = ?
       ORDER BY a.created_at DESC`,
      [phone]
    );

    // Anonymiser les emails des professionnels avant d'envoyer
    const avisAnonymises = avisRows.map(avis => ({
      ...avis,
      professional_email: anonymizeEmail(avis.professional_email)
    }));

    res.json({ phone, avis: avisAnonymises });

//    res.json({ phone, avis: avisRows });
  } catch (err) {
    console.error('Erreur lors de la récupération des avis :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/avis
router.post('/', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const professional_id = req.user.id;
  // 🧼 Nettoyer le message avec sanitize-html
  const client_phone = sanitizeHtml(req.body.client_phone || '', { allowedTags: [], allowedAttributes: {} }).trim();
  const message = sanitizeHtml(req.body.message || '', { allowedTags: [], allowedAttributes: {} }).trim();
  const is_positive = req.body.is_positive; // booléen, pas besoin de sanitize


  // ✅ Ajout du contrôle ici
  const phoneRegex = /^[0-9]{6,15}$/; // Format simple : uniquement chiffres, entre 6 et 15 chiffres
  if (!client_phone || !phoneRegex.test(client_phone)) {
    return res.status(400).json({ message: "Numéro de téléphone invalide. Utilisez uniquement des chiffres (6 à 15 chiffres)." });
  }

  if (typeof is_positive !== 'boolean') {
    return res.status(400).json({ message: "Le champ is_positive doit être un booléen." });
  }

  try {
    const [clientRows] = await db.execute('SELECT * FROM clients WHERE phone = ?', [client_phone]);
    if (clientRows.length === 0) {
      await db.execute('INSERT INTO clients (phone) VALUES (?)', [client_phone]);
    }

    await db.execute(
      `INSERT INTO avis (client_phone, professional_id, is_positive, message)
       VALUES (?, ?, ?, ?)`,
      [client_phone, professional_id, is_positive, message]
    );

    res.status(201).json({ message: "Avis enregistré ✅" });
  } catch (err) {
    console.error("Erreur ajout d'avis :", err.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
