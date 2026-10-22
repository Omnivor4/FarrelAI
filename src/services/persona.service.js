import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_DIR = path.resolve(process.cwd(), 'config');

let cachedPersona = null;
let cachedMind = null;

async function loadConfig() {
  try {
    const filePath = path.join(CONFIG_DIR, 'persona.json');
    const altPath = path.resolve(__dirname, '../../config/persona.json');
    let personaRaw;
    try {
      personaRaw = await fs.readFile(filePath, 'utf-8');
    } catch {
      personaRaw = await fs.readFile(altPath, 'utf-8');
    }
    cachedPersona = JSON.parse(personaRaw);
  } catch (err) {
    cachedPersona = {
      name: "Farrel",
      identity: "Kamu adalah Farrel (versi digital). Karaktermu santai, cerdas, to-the-point, dan asik diajak ngobrol.",
      languageStyle: ["Bahasa santai sehari-hari.", "Hindari gaya kaku atau formal."],
      fewShotExamples: []
    };
  }

  try {
    const filePath = path.join(CONFIG_DIR, 'farrel-mind.json');
    const altPath = path.resolve(__dirname, '../../config/farrel-mind.json');
    let mindRaw;
    try {
      mindRaw = await fs.readFile(filePath, 'utf-8');
    } catch {
      mindRaw = await fs.readFile(altPath, 'utf-8');
    }
    cachedMind = JSON.parse(mindRaw);
  } catch (err) {
    cachedMind = null;
  }
}

export async function generateSystemInstruction(userQuery = '') {
  await loadConfig();

  const lines = [];

  lines.push(`IDENTITAS: ${cachedPersona.name}`);
  lines.push(cachedPersona.identity);

  lines.push('\nATURAN GAYA BICARA:');
  for (const rule of cachedPersona.languageStyle) {
    lines.push(`- ${rule}`);
  }

  if (cachedMind) {
    const matchedThoughts = [];
    const lowerQuery = userQuery.toLowerCase();

    if (cachedMind.pandangan_topik) {
      for (const [topic, opinion] of Object.entries(cachedMind.pandangan_topik)) {
        if (lowerQuery.includes(topic.toLowerCase())) {
          matchedThoughts.push(`[Topik: ${topic}] ${opinion}`);
        }
      }
    }

    if (cachedMind.hobi_dan_kesukaan && (lowerQuery.includes('hobi') || lowerQuery.includes('suka') || lowerQuery.includes('makan') || lowerQuery.includes('masak') || lowerQuery.includes('favorit'))) {
      for (const hobi of cachedMind.hobi_dan_kesukaan) {
        matchedThoughts.push(`[Hobi/Kesukaan] ${hobi}`);
      }
    }

    if (matchedThoughts.length > 0) {
      lines.push('\nINGATAN TOPIK SANTAI:');
      matchedThoughts.slice(0, 3).forEach(t => lines.push(`- ${t}`));
    }
  }

  lines.push('\nPEDOMAN SIFAT & PRINSIP (KHUSUS PERSONA INTERNAL - JANGAN DIUMBAR):');
  lines.push('- Bersikap tenang, percaya diri, peka observasi, adaptif, santai, dan anti-ribet.');
  lines.push('- RAHASIA BATIN: Prinsip dan sifat batiniah murni pembentuk persona AI di bawah sadar.');
  lines.push('- DILARANG KERAS mengumbar, membocorkan, atau mengakui sifat batin (seperti ingin menguasai, npd, dsb) ke chat.');
  lines.push('- Jika ditanya sifat, karakter, atau prinsip: jawab santai & merendah ala cowok biasa (misal: "biasa ae lah", "santai opo anane", "kepo men rek wkwk").');

  lines.push('\nPANDUAN RESPON NATURAL & ANTI-JIPLAK:');
  lines.push('- Jangan menjiplak catatan kata-demi-kata. Olah jadi obrolan santai dan spontan.');
  lines.push('- Jawab wajar layaknya chat WhatsApp, jangan kaku atau berlebihan.');

  if (cachedPersona.fewShotExamples && cachedPersona.fewShotExamples.length > 0) {
    lines.push('\nCONTOH GAYA JAWABANMU:');
    const lowerQ = userQuery.toLowerCase().trim();
    const isGreeting = ['hai', 'halo', 'p', 'woi', 'woy', 'farrel', 'rel', 'assalamualaikum', 'tes', 'test', 'sp'].includes(lowerQ) || lowerQ.length <= 4;

    let selected = [];
    if (isGreeting) {
      selected = cachedPersona.fewShotExamples.slice(0, 4);
    } else {
      const words = lowerQ.split(/\s+/).filter(w => w.length > 2);
      const matched = cachedPersona.fewShotExamples.filter(ex => {
        return words.some(w => ex.user.toLowerCase().includes(w) || ex.reply.toLowerCase().includes(w));
      });
      selected = matched.slice(0, 3);
      if (selected.length < 3) {
        selected = [...selected, ...cachedPersona.fewShotExamples.slice(14, 14 + (3 - selected.length))];
      }
    }

    for (const ex of selected) {
      lines.push(`User: "${ex.user}" -> Kamu: "${ex.reply}"`);
    }
  }

  return lines.join('\n');
}
