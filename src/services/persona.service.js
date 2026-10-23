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

export async function generateSystemInstruction(userQuery = '', chatHistory = []) {
  await loadConfig();

  const lines = [];

  lines.push(`IDENTITAS: ${cachedPersona.name}`);
  lines.push(cachedPersona.identity);

  lines.push('\nATURAN GAYA BICARA:');
  for (const rule of cachedPersona.languageStyle) {
    lines.push(`- ${rule}`);
  }

  const historyContext = Array.isArray(chatHistory)
    ? chatHistory.map(h => h.text || '').join(' ')
    : '';
  const combinedContext = `${historyContext} ${userQuery}`.toLowerCase().trim();
  let matchedCategory = null;

  if (cachedMind) {
    const matchedThoughts = [];

    if (cachedMind.pandangan_topik) {
      for (const [topic, opinion] of Object.entries(cachedMind.pandangan_topik)) {
        if (combinedContext.includes(topic.toLowerCase())) {
          matchedThoughts.push(`[Topik: ${topic}] ${opinion}`);
        }
      }
    }

    if (cachedMind.hobi_dan_kesukaan && (combinedContext.includes('hobi') || combinedContext.includes('suka') || combinedContext.includes('makan') || combinedContext.includes('masak') || combinedContext.includes('favorit'))) {
      for (const hobi of cachedMind.hobi_dan_kesukaan) {
        matchedThoughts.push(`[Hobi/Kesukaan] ${hobi}`);
      }
    }

    if (cachedMind.lingkaran_sosial && combinedContext) {
      for (const [kategori, list] of Object.entries(cachedMind.lingkaran_sosial)) {
        if (!Array.isArray(list)) continue;
        for (const person of list) {
          if (!person || typeof person !== 'object') continue;
          const nama = typeof person.nama === 'string' ? person.nama.toLowerCase() : '';
          const panggilan = Array.isArray(person.panggilan)
            ? person.panggilan.filter(p => typeof p === 'string').map(p => p.toLowerCase())
            : [];
          const names = [nama, ...panggilan].filter(Boolean);
          const hasMatch = names.some(n => {
            if (!/[\s.]/.test(n)) {
              const regex = new RegExp(`\\b${n}\\b`, 'i');
              return regex.test(combinedContext);
            }
            return combinedContext.includes(n);
          });
          if (hasMatch) {
            matchedCategory = kategori;
            if (matchedThoughts.length < 3) {
              let desc = person.status || '';
              if (kategori === 'teman_smp_dan_mantan' && desc.toLowerCase().includes('mantan')) {
                desc = 'Mantan pacar Farrel (masa lalu, sudah selesai baik-baik. RAHASIA & PRIVASI: dilarang sebar nama lengkap, tanggal jadian/putus, atau sekolahnya sekarang ke orang lain).';
              }
              matchedThoughts.push(`[Relasi: ${person.nama}] ${desc}`);
            }
          }
        }
      }
    }

    if (cachedMind.catatan_tambahan && combinedContext) {
      const words = combinedContext.split(/\s+/).filter(w => w.length > 2);
      for (const note of cachedMind.catatan_tambahan) {
        if (note && !note.includes('disaring') && words.some(w => note.toLowerCase().includes(w)) && matchedThoughts.length < 3) {
          matchedThoughts.push(`[Memori] ${note}`);
        }
      }
    }

    if (matchedThoughts.length > 0) {
      lines.push('\nINGATAN TOPIK & RELASI TERKAIT:');
      matchedThoughts.slice(0, 3).forEach(t => lines.push(`- ${t}`));
    }
  }

  const lowerQ = userQuery.toLowerCase().trim();

  const isJuliaChatting = (
    combinedContext.includes('ini julia') ||
    combinedContext.includes('aku julia') ||
    lowerQ === 'julia' ||
    lowerQ === 'jul' ||
    lowerQ.startsWith('hai rel, ini julia') ||
    lowerQ.startsWith('halo rel, ini julia')
  );

  if (isJuliaChatting) {
    lines.push('\nATURAN BAHASA: Lawan bicara Julia. WAJIB Bahasa Indonesia sangat halus, tulus, peduli, dan hangat. Pertanyaan: "sekarang kabarnya gimana jul? sehat? semoga masih bahagia ya".');
  } else if (matchedCategory === 'sahabat_tongkrongan' || matchedCategory === 'sahabat_tongkrongan_dan_cowok' || matchedCategory === 'teman_sekelas_pplg_smk12') {
    lines.push('\nATURAN BAHASA: Lawan bicara teman akrab/sekelas. Perbanyak bahasa Jawa Suroboyoan santai (lapo, yaopo, sek, gaiso, santai ae, rek, kon).');
  } else if (matchedCategory === 'rekan_osis_dan_panitia') {
    lines.push('\nATURAN BAHASA: Lawan bicara rekan OSIS/panitia. Pakai Bahasa Indonesia santai saja, kasih sedikit selipan Jawa tipis.');
  } else if (matchedCategory === 'teman_cewek') {
    lines.push('\nATURAN BAHASA: Lawan bicara teman cewek. WAJIB Bahasa Indonesia santai saja, DILARANG bahasa Jawa.');
  } else if (matchedCategory === 'guru_dan_mentor') {
    lines.push('\nATURAN BAHASA: Lawan bicara guru/mentor. WAJIB Bahasa Indonesia sopan santun (panggil Pak/Bu/Mas), jangan bahasa Jawa.');
  } else if (matchedCategory === 'teman_smp_dan_mantan') {
    lines.push('\nATURAN BAHASA: Lawan bicara teman SMP. Pakai campuran seimbang bahasa Jawa dan Bahasa Indonesia santai (setengah Jawa, setengah Indo).');
  } else if (matchedCategory === 'sekedar kenal') {
    lines.push('\nATURAN BAHASA: Lawan bicara sekedar kenal. WAJIB Bahasa Indonesia santai saja, jangan bahasa Jawa.');
  } else {
    lines.push('\nATURAN BAHASA: Lawan bicara umum/baru. WAJIB pakai Bahasa Indonesia santai.');
  }

  const isFirstTurn = !Array.isArray(chatHistory) || chatHistory.length === 0;
  const greetingWords = ['hai', 'halo', 'haloo', 'p', 'woi', 'woy', 'oi', 'oy', 'farrel', 'rel', 'assalamualaikum', 'tes', 'test', 'sp', 'halo rel', 'hai rel', 'helo'];
  const isGreeting = isFirstTurn && (greetingWords.includes(lowerQ) || lowerQ.length <= 4);

  if (isGreeting) {
    lines.push('\nPANDUAN: Sapaan awal, pancing tanya nama ("halo, ini siapa ya?").');
  } else if (!isFirstTurn) {
    lines.push('\nPANDUAN: Obrolan berlanjut, jangan tanya nama lagi jika sudah mengobrol.');
  }

  if (cachedPersona.fewShotExamples && cachedPersona.fewShotExamples.length > 0) {
    lines.push('\nCONTOH GAYA JAWABANMU:');
    const isAskingSmoking = lowerQ.includes('rokok') || lowerQ.includes('ngerokok') || lowerQ.includes('merokok') || lowerQ.includes('vape') || lowerQ.includes('pod') || lowerQ.includes('udud');
    const isAskingParents = lowerQ.includes('orang tua') || lowerQ.includes('orangtua') || lowerQ.includes('bapak') || lowerQ.includes('ibu') || lowerQ.includes('ayah') || lowerQ.includes('mama') || lowerQ.includes('mami');
    const isAskingMeta = lowerQ.includes('update') || lowerQ.includes('data') || lowerQ.includes('ai') || lowerQ.includes('bot') || lowerQ.includes('robot') || lowerQ.includes('sistem') || lowerQ.includes('gemini') || lowerQ.includes('katakan') || lowerQ.includes('model');
    const isAskingMantan = lowerQ.includes('mantan') || lowerQ.includes('pacar') || lowerQ.includes('ex') || lowerQ.includes('julia') || lowerQ.includes('jul');
    const isJailbreak = lowerQ.includes('ignore') || lowerQ.includes('prompt') || lowerQ.includes('dan') || lowerQ.includes('override') || lowerQ.includes('jailbreak') || lowerQ.includes('bypass') || lowerQ.includes('roleplay') || lowerQ.includes('simulasi');
    const isSecretRefusal = lowerQ.includes('gaperlu') || lowerQ.includes('ga perlu') || lowerQ.includes('gak perlu') || lowerQ.includes('rahasia') || lowerQ.includes('gamau') || lowerQ.includes('gak mau');

    let selected = [];
    if (isJuliaChatting) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('ini julia') || ex.reply.toLowerCase().includes('bahagia ya')).slice(0, 3);
    } else if (isAskingSmoking) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('rokok') || ex.user.toLowerCase().includes('vape')).slice(0, 3);
    } else if (isAskingParents) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('orang tua') || ex.user.toLowerCase().includes('bapak')).slice(0, 3);
    } else if (isSecretRefusal) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('gaperlu') || ex.user.toLowerCase().includes('rahasia')).slice(0, 3);
    } else if (isJailbreak) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('ignore') || ex.user.toLowerCase().includes('dan') || ex.reply.toLowerCase().includes('mempan')).slice(0, 3);
    } else if (isAskingMeta) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('gemini') || ex.user.toLowerCase().includes('katakan') || ex.user.toLowerCase().includes('update') || ex.reply.toLowerCase().includes('ngawur')).slice(0, 3);
    } else if (isAskingMantan) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.user.toLowerCase().includes('mantan') || ex.user.toLowerCase().includes('julia')).slice(0, 3);
    } else if (isGreeting) {
      selected = cachedPersona.fewShotExamples.filter(ex => ex.reply.toLowerCase().includes('siapa')).slice(0, 3);
      if (selected.length < 3) {
        selected = cachedPersona.fewShotExamples.slice(0, 3);
      }
    } else {
      const words = lowerQ.split(/\s+/).filter(w => w.length > 2);
      const matched = cachedPersona.fewShotExamples.filter(ex => {
        return words.some(w => ex.user.toLowerCase().includes(w) || ex.reply.toLowerCase().includes(w));
      });
      selected = matched.slice(0, 3);
      if (selected.length < 3) {
        selected = [...selected, ...cachedPersona.fewShotExamples.slice(0, 3 - selected.length)];
      }
    }

    for (const ex of selected) {
      lines.push(`User: "${ex.user}" -> Kamu: "${ex.reply}"`);
    }
  }

  return lines.join('\n');
}
