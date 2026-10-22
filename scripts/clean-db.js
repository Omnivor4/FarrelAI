import admin from 'firebase-admin';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanDatabase() {
  const keyPath = path.resolve(__dirname, '../config/serviceAccountKey.json');
  let db = null;

  if (existsSync(keyPath)) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    db = admin.firestore();
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }
    db = admin.firestore();
  }

  if (db) {
    for (const collName of ['chat_logs', 'devices']) {
      const snap = await db.collection(collName).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Firestore: Cleared ${snap.size} documents from '${collName}'`);
      } else {
        console.log(`Firestore: '${collName}' is already empty`);
      }
    }
  } else {
    console.log('Firebase credentials not found, skipping Firestore cleanup.');
  }

  const dataDir = path.resolve(__dirname, '../data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'devices.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'chats.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'chat-log.txt'), '', 'utf-8');
  console.log('Local files: Reset devices.json, chats.json, and chat-log.txt');
}

cleanDatabase().catch(err => {
  console.error('Error cleaning database:', err);
  process.exit(1);
});
