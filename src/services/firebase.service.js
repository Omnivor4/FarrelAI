import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  localLogInteraction,
  localGetDevices,
  localGetChatLogs
} from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firestoreDb = null;
let isFirebaseInitialized = false;

function initFirebase() {
  if (isFirebaseInitialized) return firestoreDb;

  try {
    const keyPath = path.resolve(__dirname, '../../config/serviceAccountKey.json');
    const hasKeyFile = fs.existsSync(keyPath);

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (hasKeyFile) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firestoreDb = admin.firestore();
      isFirebaseInitialized = true;
      console.log('[Firebase] Connected to Firestore via serviceAccountKey.json');
    } else if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      firestoreDb = admin.firestore();
      isFirebaseInitialized = true;
      console.log('[Firebase] Connected to Firestore via Environment Variables');
    } else {
      console.log('[Firebase] No credentials found. Using lightweight local file logger (data/chat-log.txt & data/devices.json).');
    }
  } catch (err) {
    console.warn('[Firebase] Initialization error, falling back to local file storage:', err.message);
  }

  return firestoreDb;
}

initFirebase();

export async function logInteraction({ deviceId, platform, userMessage, botReply }) {
  const safeDeviceId = (typeof deviceId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(deviceId.trim()))
    ? deviceId.trim()
    : 'anon-device';
  const safePlatform = typeof platform === 'string' ? platform.slice(0, 80) : 'Web Browser';

  const isTest = (
    process.env.NODE_ENV === 'test' ||
    safeDeviceId.startsWith('test-') ||
    safeDeviceId.startsWith('api-test-') ||
    safePlatform === 'Test Runner'
  );

  if (isTest) {
    return await localLogInteraction({ deviceId: safeDeviceId, platform: safePlatform, userMessage, botReply });
  }

  if (firestoreDb) {
    try {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const deviceRef = firestoreDb.collection('devices').doc(safeDeviceId);

      await Promise.all([
        deviceRef.set({
          deviceId: safeDeviceId,
          platform: safePlatform,
          lastActive: now,
          messageCount: admin.firestore.FieldValue.increment(1)
        }, { merge: true }),
        firestoreDb.collection('chat_logs').add({
          deviceId: safeDeviceId,
          platform: safePlatform,
          userMessage,
          botReply,
          timestamp: now
        })
      ]);
      return { success: true };
    } catch (err) {
      console.warn('[Firebase Firestore write warning]', err.message);
    }
  }

  return await localLogInteraction({ deviceId: safeDeviceId, platform: safePlatform, userMessage, botReply });
}

export async function getDevices() {
  if (process.env.NODE_ENV === 'test') {
    return await localGetDevices();
  }
  if (firestoreDb) {
    try {
      const snapshot = await firestoreDb.collection('devices').orderBy('lastActive', 'desc').get();
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data());
      }
    } catch (err) {
      console.warn('[Firebase Firestore read warning]', err.message);
    }
  }
  return await localGetDevices();
}

export async function getChatLogs({ deviceId, limit = 100 } = {}) {
  if (process.env.NODE_ENV === 'test') {
    return await localGetChatLogs({ deviceId, limit });
  }
  if (firestoreDb) {
    try {
      if (deviceId) {
        const snapshot = await firestoreDb.collection('chat_logs')
          .where('deviceId', '==', deviceId)
          .limit(limit)
          .get();
        if (!snapshot.empty) {
          const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          return logs.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          });
        }
      } else {
        const snapshot = await firestoreDb.collection('chat_logs')
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get();
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      }
    } catch (err) {
      console.warn('[Firebase Firestore read warning]', err.message);
    }
  }
  return await localGetChatLogs({ deviceId, limit });
}
