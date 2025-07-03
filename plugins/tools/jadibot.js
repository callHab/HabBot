import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JADIBOT_SESSION_DIR = path.join(__dirname, '../../tmp/jadibot');

// Pastikan direktori session ada
if (!fs.existsSync(JADIBOT_SESSION_DIR)) {
  fs.mkdirSync(JADIBOT_SESSION_DIR, { recursive: true });
  console.log(chalk.green(`[JADIBOT] Created base session directory: ${JADIBOT_SESSION_DIR}`));
}

// Map untuk menyimpan koneksi jadibot aktif
const jadibotConnections = new Map();

const handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args[0]) {
      return m.reply(`Contoh penggunaan: ${usedPrefix}${command} 62812xxxxxxx`);
    }
    
    const phoneNumber = args[0].replace(/[^0-9]/g, '');
    if (!phoneNumber.startsWith('62') || phoneNumber.length < 10) {
      return m.reply('Nomor harus diawali 62 (contoh: 62812xxxxxxx)');
    }
    
    // Cek apakah sudah ada koneksi aktif
    if (jadibotConnections.has(phoneNumber)) {
      return m.reply(`Nomor ${phoneNumber} sudah memiliki sesi Jadibot aktif`);
    }

    const sessionPath = path.join(JADIBOT_SESSION_DIR, phoneNumber);
    
    // Bersihkan sesi lama jika ada
    if (fs.existsSync(sessionPath)) {
      console.log(chalk.yellow(`[JADIBOT] Cleaning up old session for: ${phoneNumber}`));
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    
    // Buat direktori session baru
    fs.mkdirSync(sessionPath, { recursive: true });
    console.log(chalk.green(`[JADIBOT] Created new session directory for: ${phoneNumber}`));

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const jadibotConn = makeWASocket({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      syncFullHistory: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: true,
      getMessage: async (key) => {
        return null;
      },
    });

    // Simpan kredensial saat berubah
    jadibotConn.ev.on('creds.update', saveCreds);

    // Event handler untuk update koneksi
    jadibotConn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        
        // Hapus semua listener untuk mencegah memory leak
        jadibotConn.ev.removeAllListeners(); 

        if (reason === DisconnectReason.badSession) {
          console.log(chalk.red(`[JADIBOT] Bad session for ${phoneNumber}, deleting...`));
          fs.rmSync(sessionPath, { recursive: true, force: true });
          jadibotConnections.delete(phoneNumber);
          await m.reply(`❌ Sesi Jadibot untuk ${phoneNumber} rusak. Silakan coba lagi.`);
        } else if (reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost) {
          console.log(chalk.yellow(`[JADIBOT] Connection lost for ${phoneNumber}, attempting reconnect...`));
          // Hapus dari map agar bisa dicoba lagi
          jadibotConnections.delete(phoneNumber);
          await m.reply(`⚠️ Sesi Jadibot untuk ${phoneNumber} terputus. Silakan coba lagi dengan command yang sama.`);
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(chalk.red(`[JADIBOT] Logged out for ${phoneNumber}`));
          fs.rmSync(sessionPath, { recursive: true, force: true });
          jadibotConnections.delete(phoneNumber);
          await m.reply(`📴 Sesi Jadibot untuk ${phoneNumber} telah logout. Silakan buat sesi baru.`);
        } else {
          console.log(chalk.red(`[JADIBOT] Connection closed for ${phoneNumber}, reason: ${reason}`));
          jadibotConnections.delete(phoneNumber);
          await m.reply(`❌ Sesi Jadibot untuk ${phoneNumber} ditutup karena alasan tidak diketahui: ${reason}.`);
        }
      } else if (connection === 'open') {
        console.log(chalk.green(`[JADIBOT] Connection opened for ${phoneNumber}`));
        jadibotConnections.set(phoneNumber, jadibotConn);
        await m.reply(`✅ Jadibot untuk ${phoneNumber} berhasil terhubung!\n\n_Bot akan aktif selama sesi berlangsung._`);
        
        // Setup message handler untuk jadibot
        jadibotConn.ev.on('messages.upsert', async (chatUpdate) => {
          try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            if (msg.key.remoteJid === 'status@broadcast') return; // Abaikan status
            if (msg.key.id.startsWith('BAE5') && msg.key.id.length === 16) return; // Abaikan pesan Baileys internal

            // Log pesan yang diterima
            console.log(chalk.blue(`[JADIBOT ${phoneNumber}] Received message from ${msg.key.remoteJid}`));
            // Contoh: Kirim balasan sederhana
            // await jadibotConn.sendMessage(msg.key.remoteJid, { text: 'Halo, saya bot jadibot!' }, { quoted: msg });

          } catch (err) {
            console.error(chalk.red(`[JADIBOT ${phoneNumber} ERROR]`), err);
          }
        });
      }
    });

    // Request pairing code
    await m.reply(`⏳ Meminta kode pairing untuk ${phoneNumber}...`);
    
    try {
      const pairingCode = await jadibotConn.requestPairingCode(phoneNumber);
      if (!pairingCode) {
        throw new Error("Failed to get pairing code. Please try again.");
      }
      const formattedCode = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;
      
      const infoMsg = `📱 *JADIBOT PAIRING CODE*\n\n` +
                     `➤ *Nomor:* ${phoneNumber}\n` +
                     `➤ *Pairing Code:* \`${formattedCode}\`\n` +
                     `⏳ *Timeout:* 60 detik\n\n` +
                     `*Cara pakai:*\n` +
                     `1. Buka WhatsApp di HP target\n` +
                     `2. Ketuk titik 3 → *Perangkat tertaut*\n` +
                     `3. Ketuk *Tautkan perangkat*\n` +
                     `4. Pilih *Tautkan dengan nomor telepon*\n` +
                     `5. Masukkan kode di atas\n\n` +
                     `⚠️ *Catatan:* Jangan bagikan kode ini kepada orang lain!`;
      
      await m.reply(infoMsg);
      
      // Set timeout untuk cleanup jika tidak terkoneksi
      setTimeout(() => {
        if (!jadibotConnections.has(phoneNumber)) {
          console.log(chalk.yellow(`[JADIBOT] Timeout for ${phoneNumber}, cleaning up...`));
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }
          m.reply(`❌ Sesi Jadibot untuk ${phoneNumber} gagal terhubung dalam 60 detik. Silakan coba lagi.`);
        }
      }, 60000); // 60 detik timeout
      
    } catch (pairingError) {
      console.error(chalk.red(`[JADIBOT] Pairing error for ${phoneNumber}:`), pairingError);
      await m.reply(`❌ Gagal mendapatkan kode pairing untuk ${phoneNumber}. Pastikan nomor benar dan coba lagi. Error: ${pairingError.message}`);
      // Hapus sesi yang mungkin sudah dibuat jika pairing gagal
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      return;
    }

  } catch (error) {
    console.error(chalk.red(`[JADIBOT ERROR]`), error);
    
    let errorMessage = '❌ Gagal membuat sesi Jadibot.';
    
    if (error.message?.includes('Connection Terminated')) {
      errorMessage = '❌ Koneksi terputus. Pastikan internet stabil dan coba lagi.';
    } else if (error.message?.includes('Connection Closed')) {
      errorMessage = '❌ Koneksi ditutup. Silakan coba lagi.';
    } else if (error.message?.includes('rate-overlimit')) {
      errorMessage = '❌ Terlalu banyak permintaan. Tunggu beberapa saat dan coba lagi.';
    } else if (error.message?.includes('invalid')) {
      errorMessage = '❌ Nomor tidak valid atau tidak terdaftar di WhatsApp.';
    } else if (error.message?.includes('ECONNREFUSED')) {
      errorMessage = '❌ Koneksi ditolak. Pastikan tidak ada firewall yang memblokir atau coba lagi nanti.';
    }
    
    await m.reply(errorMessage);
    const sessionPath = path.join(JADIBOT_SESSION_DIR, args[0].replace(/[^0-9]/g, ''));
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
};

handler.help = ['jadibot <nomor>'];
handler.tags = ['tools'];
handler.command = /^(jadibot)$/i;
handler.owner = true;

export default handler;