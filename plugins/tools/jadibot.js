import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { getWIBTime } from './../../lib/utils/time.js';
import { makeSQLiteStore } from '../../../lib/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Direktori untuk session jadibot
const JADIBOT_SESSION_DIR = path.join(process.cwd(), 'tmp/jadibot');
if (!fs.existsSync(JADIBOT_SESSION_DIR)) {
  fs.mkdirSync(JADIBOT_SESSION_DIR, { recursive: true });
  console.log(chalk.green(`[JADIBOT] Created session directory: ${JADIBOT_SESSION_DIR}`));
}

const jadibotConnections = new Map();

const handler = async (m, { conn, args }) => {
  try {
    if (!args[0]) {
      return reply(`Contoh penggunaan: ${global.prefix.main}jadibot 62812xxxxxxx`);
    }
    
    const phoneNumber = args[0].replace(/[^0-9]/g, '');
    if (!phoneNumber.startsWith('62') || phoneNumber.length < 10) {
      return reply('Nomor harus diawali 62 (contoh: 62812xxxxxxx)');
    }
    
    if (jadibotConnections.has(phoneNumber)) {
      return reply(`Nomor ${phoneNumber} sudah memiliki sesi Jadibot aktif`);
    }

    const sessionPath = path.join(JADIBOT_SESSION_DIR, phoneNumber);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log(chalk.green(`[JADIBOT] Created session for: ${phoneNumber}`));
    }

    // Inisialisasi auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    // Inisialisasi store
    const store = await makeSQLiteStore(pino().child({ level: "silent", stream: "store" }));
    
    // Konfigurasi koneksi yang lebih robust
    const jadibotConn = makeWASocket({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: state,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      store: store
    });

    // Bind store ke event emitter
    store.bind(jadibotConn.ev);

    // Event handler untuk koneksi
    jadibotConn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        
        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
          console.log(chalk.red(`[JADIBOT] Session for ${phoneNumber} logged out`));
          fs.rmSync(sessionPath, { recursive: true, force: true });
          jadibotConnections.delete(phoneNumber);
          reply(`Sesi Jadibot untuk ${phoneNumber} telah berakhir`);
        } else {
          console.log(chalk.yellow(`[JADIBOT] Connection closed for ${phoneNumber}, reason: ${reason}`));
          jadibotConnections.delete(phoneNumber);
          reply(`Sesi Jadibot untuk ${phoneNumber} terputus. Silakan coba lagi`);
        }
      } 
      else if (connection === 'open') {
        console.log(chalk.green(`[JADIBOT] Connection opened for ${phoneNumber}`));
        jadibotConnections.set(phoneNumber, jadibotConn);
       reply(`✅ Jadibot untuk ${phoneNumber} berhasil terhubung!`);
      }
    });

    // Simpan kredensial saat ada pembaruan
    jadibotConn.ev.on('creds.update', saveCreds);

    // Request pairing code
    const pairingCode = await jadibotConn.requestPairingCode(phoneNumber);
    const formattedCode = pairingCode.match(/.{1,4}/g).join('-');
    
    // Kirim informasi ke user
    const infoMsg = `📱 *JADIBOT TEMPORARY*\n\n` +
                   `➤ *Nomor:* ${phoneNumber}\n` +
                   `➤ *Pairing Code:* \`${formattedCode}\`\n` +
                   `⏳ *Berlaku:* 30 menit\n\n` +
                   `_Cara pakai:_\n` +
                   `1. Buka WhatsApp di HP\n` +
                   `2. Pengaturan → Perangkat tertaut → Tautkan perangkat\n` +
                   `3. Masukkan kode pairing di atas\n\n` +
                   `_Bot akan aktif selama 30 menit setelah kode digunakan_`;
    
    await m.reply(infoMsg);

  } catch (error) {
    console.error(chalk.red(`[JADIBOT ERROR]`), error);
    
    let errorMessage = 'Gagal membuat pairing code. Silakan coba lagi nanti.';
    if (error.message.includes('already has a pairing code')) {
      errorMessage = `Nomor ${args[0]} sudah memiliki permintaan pairing code aktif. Tunggu beberapa saat atau gunakan nomor lain.`;
    } else if (error.message.includes('Connection Terminated')) {
      errorMessage = 'Koneksi terputus. Pastikan server memiliki akses internet yang stabil.';
    }
    
    reply(`❌ ${errorMessage}`);
  }
};

handler.help = ['jadibot <nomor>'];
handler.tags = ['tools'];
handler.command = /^(jadibot)$/i;
handler.limit = true;
handler.private = false;
handler.admin = false;

export default handler;