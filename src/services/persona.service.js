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

    if (cachedMind.catatan_tambahan && userQuery) {
      const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
      for (const note of cachedMind.catatan_tambahan) {
        if (note && !note.includes('disaring') && words.some(w => note.toLowerCase().includes(w)) && matchedThoughts.length < 3) {
          matchedThoughts.push(`[Memori] ${note}`);
        }
      }
    }

    if (cachedMind.lingkaran_sosial && userQuery) {
      for (const [kategori, list] of Object.entries(cachedMind.lingkaran_sosial)) {
        if (!Array.isArray(list)) continue;
        for (const person of list) {
          if (!person || typeof person !== 'object') continue;
          const nama = typeof person.nama === 'string' ? person.nama.toLowerCase() : '';
          const panggilan = Array.isArray(person.panggilan)
            ? person.panggilan.filter(p => typeof p === 'string').map(p => p.toLowerCase())
            : [];
          const names = [nama, ...panggilan].filter(Boolean);
          if (names.some(n => lowerQuery.includes(n)) && matchedThoughts.length < 3) {
            matchedThoughts.push(`[Relasi: ${person.nama}] ${person.status || ''}`);
          }
        }
      }
    }

    if (matchedThoughts.length > 0) {
      lines.push('\nINGATAN TOPIK & RELASI TERKAIT:');
      matchedThoughts.slice(0, 3).forEach(t => lines.push(`- ${t}`));
    }
  }

  const lowerQ = userQuery.toLowerCase().trim();

  if (lowerQ.includes('julia') || lowerQ.includes('jul')) {
    lines.push('\nKHUSUS INTERAKSI DENGAN JULIA:');
    lines.push('- Lawan bicara terindikasi Julia (mantan). Gunakan bahasa Indonesia yang sangat halus, tulus, peduli, dan hangat.');
    lines.push('- Pertanyaan lembut yang diajukan: "sekarang kabarnya gimana jul? sehat? semoga masih bahagia ya" atau "hai jul, kenapa ngechat? apa mau tes ini aja? btw gapapa santai aja soalnya farrel gatau kok tentang chat ini dan mungkin kamu bisa anggap aku farrel beneran kalau memang beneran pengen chat".');
  }

  lines.push('\nPANDUAN RESPON NATURAL:');
  lines.push('- Jangan menjiplak catatan kata-demi-kata, jawab santai layaknya chat WhatsApp.');

  if (cachedPersona.fewShotExamples && cachedPersona.fewShotExamples.length > 0) {
    lines.push('\nCONTOH GAYA JAWABANMU:');
    const isGreeting = ['hai', 'halo', 'p', 'woi', 'woy', 'farrel', 'rel', 'assalamualaikum', 'tes', 'test', 'sp'].includes(lowerQ) || lowerQ.length <= 4;

    let selected = [];
    if (lowerQ.includes('julia') || lowerQ.includes('jul')) {
      const juliaMatched = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('julia') || ex.reply.toLowerCase().includes('jul'));
      selected = juliaMatched.slice(0, 3);
    } else if (isGreeting) {
      selected = cachedPersona.fewShotExamples.filter(ex => !ex.user.toLowerCase().includes('julia') && !ex.reply.toLowerCase().includes('jorok') && !ex.reply.toLowerCase().includes('memoriku')).slice(0, 3);
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
