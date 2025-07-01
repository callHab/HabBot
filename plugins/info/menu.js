import os from 'os';
import { performance } from 'perf_hooks';
import { getCommands } from '../../lib/pluginLoader.js'; // Pastikan ini diimpor

const handler = async (m, { reply, db, sender }) => {
  const t0 = performance.now(); // Waktu mulai untuk perhitungan ping
  const user = db.getUser(sender); // Mendapatkan data user dari database
  const isPrem = db.isPremium(sender); // Memeriksa status premium user

  const allCommands = getCommands(); // Mendapatkan semua command yang dimuat dari pluginLoader
  const categorizedCommands = {};

  // Mengelompokkan command berdasarkan kategori
  for (const cmdName in allCommands) {
    const cmdData = allCommands[cmdName];
    // Hanya tampilkan command utama, bukan alias
    if (cmdData.isAlias) continue; 

    const category = cmdData.category || 'uncategorized'; // Ambil kategori dari metadata
    if (!categorizedCommands[category]) {
      categorizedCommands[category] = [];
    }
    categorizedCommands[category].push(cmdData);
  }

  let menuText = `╭─「 *MENU* 」\n`;
  menuText += `│ 👤 *Nama:* ${m.pushName || '-'}\n`;
  menuText += `│ 🔰 *Premium:* ${isPrem ? '✅ Ya' : '❌ Tidak'}\n`;
  menuText += `│ ⏳ *Limit:* ${isPrem ? '♾️ Unlimited' : (user.limit || 0)}\n`;
  menuText += `│ 💻 *OS:* ${os.platform()} ${os.release()}\n`;
  menuText += `│ 📶 *Ping:* ${(performance.now() - t0).toFixed(2)} ms\n`;
  menuText += `╰─────────┈\n`;

  // Mengurutkan kategori secara alfabetis
  const sortedCategories = Object.keys(categorizedCommands).sort();

  for (const category of sortedCategories) {
    menuText += `\n📁 *${category.toUpperCase()}*\n`;
    // Mengurutkan command dalam kategori secara alfabetis
    categorizedCommands[category].sort((a, b) => a.metadata.command[0].localeCompare(b.metadata.command[0]));

    for (const cmdData of categorizedCommands[category]) {
      const mainCommand = cmdData.metadata.command[0];

      let commandDisplay = `${global.prefix.main}${mainCommand}`;

      const badges = [];
      if (cmdData.metadata.premium) {
        badges.push('🔰'); // Badge untuk premium
      }
      if (cmdData.metadata.limit) {
        badges.push('⏳'); // Badge untuk limit
      }
      
      menuText += `├ ${commandDisplay} ${badges.join(' ')}\n`;
    }
  }

  menuText += `\n*Keterangan Badges:*\n`;
  menuText += `🔰 = Command Premium\n`;
  menuText += `⏳ = Command Menggunakan Limit\n`;
  menuText += `\nTotal Command: ${Object.keys(allCommands).length}`;

  await reply(menuText);
};

handler.help = ["menu"];
handler.tags = ["info"];
handler.command = ["menu"]; // Command utama untuk memanggil menu

export default handler;
