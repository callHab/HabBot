import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { getWIBTime } from '../../lib/utils/time.js'
import { makeSQLiteStore } from '../../lib/store.js' // <-- IMPORT makeSQLiteStore

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Direktori untuk menyimpan sesi jadibot
const JADIBOT_SESSION_DIR = path.join(__dirname, '../../../tmp/jadibot')
if (!fs.existsSync(JADIBOT_SESSION_DIR)) fs.mkdirSync(JADIBOT_SESSION_DIR, { recursive: true })

// Map untuk menyimpan koneksi jadibot yang aktif
const jadibotConnections = new Map()

const handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    // Validasi nomor
    if (!args[0]) throw `Contoh penggunaan: ${usedPrefix}${command} 62812xxxxxxx`
    
    const phoneNumber = args[0].replace(/[^0-9]/g, '')
    if (!phoneNumber.startsWith('62') || phoneNumber.length < 10) throw 'Nomor harus diawali 62 (contoh: 62812xxxxxxx)'

    // Cek apakah nomor ini sudah ada koneksi jadibot aktif
    if (jadibotConnections.has(phoneNumber)) {
      return m.reply(`Nomor ${phoneNumber} sudah memiliki sesi Jadibot yang aktif.`)
    }

    const sessionPath = path.join(JADIBOT_SESSION_DIR, phoneNumber)
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

    // Inisialisasi auth state untuk jadibot
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    // Inisialisasi store SQLite untuk jadibot
    const store = await makeSQLiteStore(null) // Pass null for logger if you don't want separate logs for jadibot store

    const jadibotConn = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      browser: ["Chrome (Linux)", "Chrome", "1.0.0"], // Browser default untuk jadibot
      syncFullHistory: true,
      markOnlineOnConnect: true,
      store: store // <-- GUNAKAN STORE SQLITE UNTUK JADIBOT
    })

    store.bind(jadibotConn.ev)

    // Event listener untuk koneksi jadibot
    jadibotConn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode
        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
          console.log(chalk.red(`[JADIBOT] Session for ${phoneNumber} logged out or bad session. Deleting...`))
          // Hapus sesi jika logged out atau bad session
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
          }
          jadibotConnections.delete(phoneNumber)
          m.reply(`Sesi Jadibot untuk ${phoneNumber} telah berakhir.`)
        } else {
          console.log(chalk.yellow(`[JADIBOT] Connection for ${phoneNumber} closed, reconnecting...`))
          // Coba reconnect jika bukan logged out
          // Note: Untuk jadibot, kita tidak otomatis reconnect. User harus jalankan perintah lagi.
          // Ini untuk mencegah loop tak terbatas jika ada masalah koneksi.
          jadibotConnections.delete(phoneNumber) // Hapus dari map agar bisa dibuat ulang
          m.reply(`Sesi Jadibot untuk ${phoneNumber} terputus. Silakan coba lagi jika ingin mengaktifkan kembali.`)
        }
      } else if (connection === 'open') {
        console.log(chalk.green(`[JADIBOT] Connection opened for ${phoneNumber}`))
        jadibotConnections.set(phoneNumber, jadibotConn)
        m.reply(`Jadibot untuk ${phoneNumber} berhasil terhubung!`)
      }
    })

    // Simpan kredensial jadibot
    jadibotConn.ev.on('creds.update', saveCreds)

    // Request pairing code
    const pairingCode = await jadibotConn.requestPairingCode(phoneNumber)
    const formattedCode = pairingCode.match(/.{1,4}/g).join('-')
    
    // Kirim informasi ke user
    const infoMsg = `*JADIBOT TEMPORARY*\n\n` +
                    `📱 *Nomor:* ${phoneNumber}\n` +
                    `🔑 *Pairing Code:* ${formattedCode}\n` +
                    `⏳ *Berlaku:* Sampai terputus atau Anda logout.\n\n` +
                    `_Cara pakai:_\n` +
                    `1. Buka WhatsApp di HP\n` +
                    `2. Pengaturan → Perangkat tertaut → Tautkan perangkat\n` +
                    `3. Masukkan kode pairing di atas`
    
    await conn.sendMessage(m.chat, {
      text: infoMsg,
      contextInfo: {
        externalAdReply: {
          title: `Jadibot - ${global.botName}`,
          body: 'Temporary WhatsApp Bot',
          thumbnailUrl: global.appearance.thumbUrl,
          sourceUrl: "https://github.com/callHab/Habbotv3.5" // Opsional: tambahkan link repo Anda
        }
      }
    })

  } catch (error) {
    console.error(chalk.red(`[JADIBOT ERROR]`), error)
    let errorMessage = '_Gagal membuat pairing code. Coba lagi nanti._'
    if (error.message.includes('already has a pairing code')) {
      errorMessage = `Nomor ${args[0]} sudah memiliki permintaan pairing code yang aktif. Silakan coba lagi setelah beberapa saat atau pastikan Anda belum menautkan perangkat.`
    }
    m.reply(errorMessage)
  }
}

handler.help = ['jadibot <nomor>']
handler.tags = ['tools']
handler.command = ['jadibot']
handler.private = false // Bisa diakses di grup atau private chat
handler.admin = false // Tidak perlu admin grup

export default handler
