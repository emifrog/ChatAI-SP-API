import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StreamChat } from 'stream-chat';
import axios from 'axios';
import { db } from './config/database.js';
import { chats, users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Vérifier si la variable d'environnement JWT_SECRET est définie
if (!process.env.JWT_SECRET) {
  console.warn('ATTENTION: JWT_SECRET n\'est pas défini dans les variables d\'environnement. Utilisation d\'une valeur par défaut pour le développement.');
  process.env.JWT_SECRET = 'dev_secret_key_not_secure';
}

// Routes d'authentification
app.use('/auth', authRouter);

// Initialize Stream Client
const chatClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

// Initialize OpenRouter for Deepseek API access
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

// Route legacy pour la rétrocompatibilité
// À terme, utiliser plutôt /auth/register
app.post(
  '/register-user',
  async (req: Request, res: Response): Promise<any> => {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    try {
      const userId = email.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Check if user exists
      const userResponse = await chatClient.queryUsers({ id: { $eq: userId } });

      if (!userResponse.users.length) {
        // Add new user to stream
        await chatClient.upsertUser({
          id: userId,
          name: name,
          email: email,
          role: 'user',
        });
      }

      // Check for existing user in database
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, userId));

      if (!existingUser.length) {
        console.log(
          `User ${userId} does not exist in the database. Adding them...`
        );
        // Générer un mot de passe temporaire haché (l'utilisateur devra le réinitialiser)
        const tempPassword = `temp_${Math.random().toString(36).substring(2, 10)}`;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);
        
        await db.insert(users).values({ 
          userId, 
          name, 
          email, 
          password: hashedPassword 
        });
      }

      res.status(200).json({ userId, name, email });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// Send message to AI - Route protégée par JWT
app.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  const { message, userId } = req.body;

  if (!message || !userId) {
    res.status(400).json({ error: 'Message and user are required' });
    return;
  }

  try {
    console.log(`Processing chat request for user: ${userId}`);
    console.log(`OpenRouter API Key available: ${openRouterApiKey ? 'Yes' : 'No'}`);
    
    // Verify user exists
    const userResponse = await chatClient.queryUsers({ id: userId });

    if (!userResponse.users.length) {
      res.status(404).json({ error: 'user not found. Please register first' });
      return;
    }

    // Check user in database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId));

    if (!existingUser.length) {
      res.status(404).json({ error: 'User not found in database, please register' });
      return;
    }

    // Fetch users past messages for context
    const chatHistory = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(chats.createdAt)
      .limit(10);

    // Format chat history for OpenRouter
    const conversation = chatHistory.flatMap(
      (chat) => [
        { role: 'user', content: chat.message },
        { role: 'assistant', content: chat.reply },
      ]
    );

    // Add latest user messages to the conversation
    conversation.push({ role: 'user', content: message });

    // Send message to Deepseek via OpenRouter
    let aiMessage: string;
    try {
      if (!openRouterApiKey) {
        throw new Error('OpenRouter API key is missing. Please check your .env file.');
      }
      
      console.log('Sending request to OpenRouter...');
      
      const payload = {
        model: 'tngtech/deepseek-r1t2-chimera:free',  // Utilisation du modèle deepseek/deepseek-r1-0528:free
        messages: conversation,
      };
      
      console.log('Request payload:', JSON.stringify(payload));
      
      const response = await axios.post(
        openRouterUrl,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
            'X-Title': 'ChatAI-SP',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('OpenRouter response received');
      
      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        console.error('Invalid response format from OpenRouter:', response.data);
        throw new Error('Invalid response format from AI service');
      }
      
      aiMessage = response.data.choices[0].message?.content ?? 'No response from AI';
    } catch (error: any) {
      console.error('Error calling OpenRouter API:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to get response from AI service: ${error.message}`);
    }

    // Save chat to database
    await db.insert(chats).values({ userId, message, reply: aiMessage });

    // Create or get channel
    const channel = chatClient.channel('messaging', `chat-${userId}`, {
      name: 'AI Chat',
      created_by_id: 'ai_bot',
    });

    await channel.create();
    await channel.sendMessage({ text: aiMessage, user_id: 'ai_bot' });

    res.status(200).json({ reply: aiMessage });
  } catch (error: any) {
    console.error('Error generating AI response:', error.message);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    return;
  }
});

// Get chat history for a user - Route protégée par JWT
app.post('/get-messages', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  try {
    const chatHistory = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId));

    res.status(200).json({ messages: chatHistory });
  } catch (error) {
    console.log('Error fetching chat history', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on ${PORT}`));