# ChatAI-SP API

Backend de l'application ChatAI-SP, une application chatbot full stack, qui répond aux questions et conserve le contexte tout au long de la conversation. Le backend est construit avec Node.js et Express en TypeScript, utilise Stream pour les fonctionnalités de chat, Deepseek via OpenRouter pour l'IA, et une base de données Neon PostgreSQL avec Drizzle ORM pour stocker les utilisateurs et les journaux de chat.

## Fonctionnalités

- Authentification JWT pour sécuriser les routes
- Intégration avec Deepseek via OpenRouter pour les réponses IA
- Stockage des conversations dans une base de données PostgreSQL
- Gestion des utilisateurs avec mots de passe hachés
- API RESTful pour communiquer avec le frontend

## Dépendances

- **express** : Framework web backend
- **cors** : Cross-Origin Resource Sharing
- **dotenv** : Chargement des variables d'environnement depuis le fichier .env
- **stream-chat** : Client JS officiel pour travailler avec Stream Chat
- **axios** : Client HTTP pour les requêtes API
- **typescript** : Ajout de types à JavaScript
- **tsx** : TypeScript avec JSX
- **drizzle-orm** : ORM pour travailler avec PostgreSQL
- **drizzle-kit** : CLI pour drizzle-orm
- **jsonwebtoken** : Génération et vérification des tokens JWT
- **bcrypt** : Hachage des mots de passe



## Installation

1. Cloner le dépôt
2. Exécuter `npm install`
3. Créer un fichier `.env` dans le répertoire racine et ajouter les variables d'environnement suivantes :

```
PORT=5000
STREAM_API_KEY="votre_clé_stream"
STREAM_API_SECRET="votre_secret_stream"
DATABASE_URL="votre_url_base_de_données"
OPENROUTER_API_KEY="votre_clé_openrouter"
APP_URL="http://localhost:5000"
JWT_SECRET="votre_secret_jwt"

```

## Démarrage

```bash
# Mode développement
npm run dev

# Construction pour production
npm run build

# Démarrage en production
npm start
```

## Routes API

### Authentification
- `POST /auth/register` : Inscription d'un nouvel utilisateur
- `POST /auth/login` : Connexion d'un utilisateur existant

### Chat
- `POST /chat` : Envoyer un message à l'IA (protégé par JWT)
- `POST /get-messages` : Récupérer l'historique des messages (protégé par JWT)

### Legacy
- `POST /register-user` : Ancienne route d'inscription (pour compatibilité)
OPENROUTER_API_KEY=""
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
You can get these keys by signing up for Stream, Open AI, and Neon.

Run database migrations with Drizzle Kit:
npx drizzle-kit generate
npx drizzle-kit migrate
This will create the necessary tables in your database.

Run the server with npm run dev and open on http://localhost:5174

Building For Production
This is a TypeScript project, so you will need to build the project before running in production. Run npm run build to build the project. You can then run the server with npm start. The files will be in the dist directory.