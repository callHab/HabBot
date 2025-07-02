// File: plugins/tools/jadibot.js
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { getWIBTime } from './../../lib/utils/time.js';
import { makeSQLiteStore } from '../../lib/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan path absolut dan benar
const JADIBOT_SESSION_BASE_DIR = path.join(process.cwd(), 'tmp', 'jadibot');
if (!fs.existsSync(JADIBOT_SESSION_BASE_DIR)) {
  fs.mkdirSync(JADIBOT_SESSION_BASE_DIR, { recursive: true });
  console.log(chalk.green(`[JADIBOT] Created session base directory: ${JADIBOT_SESSION_BASE_DIR}`));
} else {
  console.log(chalk.yellow(`[JADIBOT] Using existing session base directory: ${JADIBOT_SESSION_BASE_DIR}`));
}

const jadibotConnections = new Map();

const handler = async (m, { conn, args, usedPrefix, command, reply }) => {
  try {
    if (!args[0]) {
      return reply(`Contoh penggunaan:\n${usedPrefix}${command} 62812xxxxxxx`);
    }
    
    const phoneNumber = args[0].replace(/[^0-9]/g, '');
    if (!phoneNumber.startsWith('62') || phoneNumber.length < 10) {
      return reply('Nomor harus diawali 62 dan minimal 10 digit!\nContoh: 6281234567890') ;
    }
    
    if (jadibotConnections.has(phoneNumber)) {
      return reply(`📵 Nomor *${phoneNumber}* sudah memiliki sesi Jadibot aktif.\nTunggu hingga sesi sebelumnya berakhir.`);
    }

    const sessionPath = path.join(JADIBOT_SESSION_BASE_DIR, phoneNumber);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log(chalk.green(`[JADIBOT] Created session directory for: ${phoneNumber}`));
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const store = await makeSQLiteStore(null);

    const jadibotConn = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      browser: ["Chrome (Linux)", "Chrome", "1.0.0"],
      syncFullHistory: true,
      markOnlineOnConnect: true,
      store: store
    });

    store.bind(jadibotConn.ev);

    jadibotConn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
          console.log(chalk.red(`[JADIBOT] 💾 Session for ${phoneNumber} logged out. Removing...`));
          try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(chalk.green(`[JADIBOT] ✅ Session data cleared for ${phoneNumber}`));
          } catch (cleanupError) {
            console.error(chalk.red(`[JADIBOT] ❌ Error clearing session for ${phoneNumber}:`), cleanupError);
          }
          jadibotConnections.delete(phoneNumber);
          reply(`🔒 Sesi Jadibot untuk *${phoneNumber}* telah berakhir.\nData sesi telah dihapus.`);
        } else {
          jadibotConnections.delete(phoneNumber);
          reply(`⚠️ Sesi Jadibot untuk *${phoneNumber}* terputus.\nSilakan ketik ulang perintah untuk mencoba kembali.`);
        }
      } else if (connection === 'open') {
        console.log(chalk.green(`[JADIBOT] 🌐 Connection opened for ${phoneNumber}`));
        jadibotConnections.set(phoneNumber, jadibotConn);
        reply(`✅ *Jadibot Aktif!*\nAnda sekarang terkoneksi sebagai bot sementara dengan nomor:\n📱 *${phoneNumber}*\n\nBot akan tetap aktif hingga Anda logout perangkat atau sesi berakhir.`);
      }
    });

    jadibotConn.ev.on('creds.update', saveCreds);

    const pairingCode = await jadibotConn.requestPairingCode(phoneNumber);
    const formattedCode = pairingCode.match(/.{1,4}/g).join('-');
    
    const infoMsg = 
      `*📱 JADIBOT TEMPORARY*\n\n` +
      `▢ *Nomor*: ${phoneNumber}\n` +
      `▢ *Pairing Code*: \`${formattedCode}\`\n\n` +
      `_Cara Pakai_:` +
      `\n1. Buka *WhatsApp* di HP` +
      `\n2. Ketuk *⋮* » *Setelan* » *Perangkat terkait*` +
      `\n3. Pilih *Tautkan perangkat*` +
      `\n4. Masukkan kode di atas\n\n` +
      `_Catatan_:` +
      `\n• Kode berlaku 30 menit` +
      `\n• Sesi aktif hingga logout manual`;
    
    await conn.sendMessage(m.chat, {
      text: infoMsg,
      contextInfo: {
        externalAdReply: {
          title: `Jadibot by ${global.botName}`,
          body: 'Temporary WhatsApp Bot',
          thumbnailUrl: global.appearance.thumbUrl || 'https://placehold.co/300x300?text=Thumbnail',
          mediaType: 1,
          sourceUrl: 'https://github.com/callHab/Habbotv3.5'
        }
      }
    });

    // Auto cleanup after 30 minutes if not connected
    setTimeout(() => {
      if (jadibotConnections.has(phoneNumber)) {
        jadibotConnections.delete(phoneNumber);
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          console.log(chalk.yellow(`[JADIBOT] ♻️ Auto-cleaned inactive session: ${phoneNumber}`));
        } catch (cleanupError) {
          console.error(chalk.red(`[JADIBOT] ❌ Error cleaning session:`, cleanupError));
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

  } catch (error) {
    console.error(chalk.red(`[JADIBOT ERROR] ❌`), error);
    
    let errorMessage = '_❌ Gagal membuat Jadibot. Silakan coba lagi nanti._';
    if (error.message.includes('already has a pairing code')) {
      errorMessage = `📵 *Nomor ${args[0]} sudah memiliki permintaan pairing code aktif.*\n\n_hapus sesi jadibot terkait terlebih dahulu._`;
    } else if (error.message.includes('timed out')) {
      errorMessage = '⏳ *Waktu permintaan habis.*\nPastikan nomor WhatsApp valid dan jaringan stabil.';
    }
    
    reply(errorMessage);
  }
};

handler.help = ['jadibot <nomor>'];
handler.tags = ['tools'];
handler.command = ['jadibot'];

export default handler;