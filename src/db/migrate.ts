import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL n\'est pas défini dans les variables d\'environnement');
    process.exit(1);
  }

  try {
    console.log('Démarrage de la migration...');
    
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Exécuter les migrations
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    process.exit(1);
  }
}

runMigration();
