# ChatAI-SP App

Application full stack similaire à ChatGPT, qui répond aux questions et conserve le contexte tout au long de la conversation. Nous utiliserons Vue.js avec Pinia pour la gestion des états, Node et Express en backend avec TypeScript. Stream pour les fonctionnalités de chat et une base de données Neon PostgreSQL pour stocker les utilisateurs et les journaux de chat.

## Backend dependencies for ChatAI :

express : Backend web framework
cors : Cross-Origin Resource Sharing
dotenv : Load environment variables from .env file
stream-chat : Official JS client to work with Stream Chat
openai : OpenAI API
typescript : Add types to JavaScript
tsx : TypeScript with JSX
drizzle-orm : Database ORM for work with postgres
drizzle-kit : CLI for drizzle-orm

## Frontend dependencies for ChatAI :

vue : Frontend JS Framework
vite : Dev server & environment
pinia : State management library
axios : HTTP library
tailwindcss : CSS framework
vue-router : Routing for vue
typescript : Add types to JS

## Installation

Clone the repository
Run npm install
Create a .env file in the root directory and add the following environment variables:
PORT=5000
STREAM_API_KEY=""
STREAM_API_SECRET=""
OPENAI_API_KEY=""
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
You can get these keys by signing up for Stream, Open AI, and Neon.

Run database migrations with Drizzle Kit:
npx drizzle-kit generate
npx drizzle-kit migrate
This will create the necessary tables in your database.

Run the server with npm run dev and open on http://localhost:5174

Building For Production
This is a TypeScript project, so you will need to build the project before running in production. Run npm run build to build the project. You can then run the server with npm start. The files will be in the dist directory.