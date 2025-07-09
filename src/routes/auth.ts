import express, { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { StreamChat } from 'stream-chat';

const router: Router = express.Router();

// Initialiser Stream Chat
const chatClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

// Route d'inscription
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Nom, email et mot de passe sont requis' });
    return;
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const userId = email.replace(/[^a-zA-Z0-9_-]/g, '_');
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId));

    if (existingUser.length) {
      res.status(400).json({ error: 'Cet utilisateur existe déjà' });
      return;
    }

    // Hacher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur dans Stream Chat
    await chatClient.upsertUser({
      id: userId,
      name: name,
      email: email,
      role: 'user',
    });

    // Enregistrer l'utilisateur dans la base de données
    await db.insert(users).values({
      userId,
      name,
      email,
      password: hashedPassword
    });

    // Générer un token JWT
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: { userId, name, email }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Route de connexion
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe sont requis' });
    return;
  }

  try {
    // Récupérer l'utilisateur par email
    const userId = email.replace(/[^a-zA-Z0-9_-]/g, '_');
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId));

    if (!userResult.length) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      return;
    }

    const user = userResult[0];

    // Vérifier si l'utilisateur a un mot de passe (pour la compatibilité avec les utilisateurs existants)
    if (!user.password) {
      res.status(401).json({ error: 'Veuillez réinitialiser votre mot de passe' });
      return;
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      return;
    }

    // Générer un token JWT
    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: { userId: user.userId, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

export default router;
