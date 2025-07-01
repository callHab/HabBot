// Di dalam plugins/info/menu.js

import os from 'os';
import { performance } from 'perf_hooks';
import { getCommands } from '../../lib/pluginLoader.js';
import db from '../../lib/database.js';

const handler = async (m, { reply, sender }) => {
  const t0 = performance.now();
  const user = db.getUser(sender);
  const isPrem = db.isPremium(sender);

  const allCommands = getCommands();
  const categorizedCommands = {};

  // Mengelompokkan command utama dan aliases
  for (const cmdName in allCommands) {
    const cmdData = allCommands[cmdName];
    
    // Jika ini adalah alias, abaikan (akan ditampilkan di command utama)
    if (cmdData.isAlias) continue;

    // Ambil data command dari database
    const dbCommand = db.getCommand(cmdData.metadata.command[0]);
    
    const category = cmdData.category || 'uncategorized';
    if (!categorizedCommands[category]) {
      categorizedCommands[category] = [];
    }

    // Tambahkan command utama dan semua aliasnya
    const mainCommand = {
      ...cmdData,
      metadata: {
        ...cmdData.metadata,
        premium: dbCommand.premium,
        limit: dbCommand.limit,
        limitCost: dbCommand.limitCost,
        // Tambahkan informasi aliases
        aliases: cmdData.metadata.command.slice(1) // Ambil semua alias setelah command utama
      }
    };
    
    categorizedCommands[category].push(mainCommand);
  }

  let menuText = `╭─「 *MENU* 」\n`;
  menuText += `│ 👤 *Nama:* ${m.pushName || '-'}\n`;
  menuText += `│ 🔰 *Premium:* ${isPrem ? '✅ Ya' : '❌ Tidak'}\n`;
  menuText += `│ ⏳ *Limit:* ${isPrem ? '♾️ Unlimited' : (user.limit || 0)}\n`;
  menuText += `│ 💻 *OS:* ${os.platform()} ${os.release()}\n`;
  menuText += `│ 📶 *Ping:* ${(performance.now() - t0).toFixed(2)} ms\n`;
  menuText += `╰─────────┈\n`;

  // Mengurutkan kategori
  const sortedCategories = Object.keys(categorizedCommands).sort();

  for (const category of sortedCategories) {
    menuText += `\n📁 *${category.toUpperCase()}*\n`;
    
    // Mengurutkan command dalam kategori
    categorizedCommands[category].sort((a, b) => 
      a.metadata.command[0].localeCompare(b.metadata.command[0])
    );

    for (const cmdData of categorizedCommands[category]) {
      const mainCommand = cmdData.metadata.command[0];
      
      let commandDisplay = `${global.prefix.main}${mainCommand}`;
      
      // Tambahkan aliases jika ada
      if (cmdData.metadata.aliases && cmdData.metadata.aliases.length > 0) {
        commandDisplay += ` (Alias: ${cmdData.metadata.aliases.map(a => `${global.prefix.main}${a}`).join(', ')})`;
      }

      const badges = [];
      if (cmdData.metadata.premium) badges.push('🔰');
      if (cmdData.metadata.limit) badges.push('⏳');
      
      menuText += `├ ${commandDisplay} ${badges.join(' ')}\n`;
    }
  }

  menuText += `\n*Keterangan:*\n`;
  menuText += `🔰 = Command Premium\n`;
  menuText += `⏳ = Command Menggunakan Limit\n`;
  menuText += `*Alias* = Nama alternatif command\n`;
  menuText += `\nTotal Command: ${Object.keys(allCommands).filter(cmd => !allCommands[cmd].isAlias).length}`;

  await reply(menuText);
};

handler.help = ["menu"];
handler.tags = ["info"];
handler.command = ["menu"];

export default handler;
