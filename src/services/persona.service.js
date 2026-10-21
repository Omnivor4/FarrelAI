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

    if (matchedThoughts.length > 0) {
      lines.push('\nISI PIKIRAN TERKAIT TOPIK INI:');
      matchedThoughts.forEach(t => lines.push(`- ${t}`));
    } else if (cachedMind.prinsip_dan_sifat && cachedMind.prinsip_dan_sifat.length > 0) {
      lines.push(`\nPRINSIP UTAMA: ${cachedMind.prinsip_dan_sifat[0]}`);
    }
  }

  if (cachedPersona.fewShotExamples && cachedPersona.fewShotExamples.length > 0) {
    lines.push('\nCONTOH GAYA JAWABANMU:');
    for (const ex of cachedPersona.fewShotExamples.slice(0, 4)) {
      lines.push(`User: "${ex.user}" -> Kamu: "${ex.reply}"`);
    }
  }

  return lines.join('\n');
}
