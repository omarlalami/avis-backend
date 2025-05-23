const express = require('express');
// a appeler juste apress express  pour appliquer helmet sur les routes
const helmet = require('helmet')
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const app = express();
// a appeler avant tout autre app.use pour appliquer helmet sur les routes
app.use(helmet());
const PORT = process.env.PORT || 5000;

/* const authRouter = require('./routes/auth');
app.use('/api', authRouter); */

// Middlewares
//app.use(cors());
app.use(cors({
  origin: 'http://localhost:3000', // ou l'URL de ton frontend en production
  optionsSuccessStatus: 200,
  credentials: true
}));

app.set('trust proxy', 1); // À activer si tu es derrière un proxy (Heroku, Render, etc.)

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
/*  si on veut limiter le cors a react seulement on fait :
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000'
})); */
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const avisRoutes = require('./routes/avis');
app.use('/api/avis', avisRoutes);

// Connexion à la base MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

let db;

async function initDb() {
  try {
    db = await mysql.createPool(dbConfig);
    app.locals.db = db;
    console.log('✅ Connexion à MySQL réussie');
  } catch (err) {
    console.error('❌ Erreur de connexion MySQL :', err.message);
    process.exit(1);
  }
}

// Exemple de route de test
app.get('/', (req, res) => {
  res.send('API opérationnelle ✅');
});

// Lancer le serveur
app.listen(PORT, async () => {
  await initDb();
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
