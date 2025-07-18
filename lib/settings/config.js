global.botName = "HabBOT - MD"
global.botVersion = "4.5.0"
global.ownerName = "H4bDev"
global.packname = "HabBOT Sticker"
global.author = "6287897464262"

global.owner = [
  {
    number: "6287856546952", // <<-- Pastikan ini adalah nomor WhatsApp yang valid tanpa '+' atau '@s.whatsapp.net'
    name: "H4bDev",
    isDev: true
  }
]

global.prefix = {
  main: ".",
  multi: false,
  list: [".", "#", "!", "/", "\\"]
}

global.sessionDir = "./session" // <<-- Pastikan direktori ini aman dan memiliki izin tulis
global.sessionCleanupInterval = 8

global.database = {
  users: "./database/users.json",
  commands: "./database/commands.json"
}

global.limitConfig = {
  defaultLimit: 20,
  resetInterval: "daily", // "daily" atau "hourly"
  resetTime: "00:00" // Waktu reset harian (HH:MM) - saat ini tidak digunakan secara langsung di logika reset, hanya interval
}

global.premiumConfig = {
  unlimitedLimit: true,
  premiumCommands: []
}

global.appearance = {
  timezone: "Asia/Jakarta", // <<-- Pastikan timezone yang benar
  timeFormat: "HH:mm:ss",
  dateFormat: "DD/MM/YYYY",
  fullDateFormat: "DD/MM/YYYY HH:mm:ss",
  thumbUrl: "https://avatars.githubusercontent.com/u/218592586?v=4", // <<-- Pastikan URL ini valid dan dapat diakses
  theme: {
    gradient: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
    gradients: {
      success: ["#00C851", "#007E33"],
      error: ["#FF4444", "#CC0000"],
      warning: ["#FF8800", "#FF6600"],
      info: ["#33B5E5", "#0099CC"]
    },
    minWidth: 60,
    maxWidth: 100,
    box: {
      cornerChar: "╔",
      horizontalChar: "═",
      verticalChar: "║"
    },
    cliDisplay: {
      header: {
        defaultFont: 'Bloody',
        horizontalLayout: 'fitted',
        whitespaceBreak: true,
        mainHeaderWidth: 60,
        subHeaderWidth: 40,
        footerWidth: 40,
      },
      infoBox: {
        width: 50,
        height: 8,
        marks: {
          nw: '╔', n: '═', ne: '╗',
          e: '║', se: '╝', s: '═',
          sw: '╚', w: '║'
        }
      },
      pairingCodeBox: {
        width: 40,
        height: 5,
        marks: {
          nw: "╔", n: "═", ne: "╗",
          e: "║", se: "╝", s: "═",
          sw: "╚", w: "║",
        }
      }
    }
  }
}

import fs from "fs"
import { fileURLToPath } from "url"
import chalk from "chalk"

const __filename = fileURLToPath(import.meta.url)

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`[CONFIG] Configuration updated, restarting...`))
  // <<-- PENINGKATAN: Gunakan process manager (misalnya PM2) untuk memastikan bot otomatis restart setelah process.exit(1)
  process.exit(1) 
})

export default {
  botName: global.botName,
  botVersion: global.botVersion,
  ownerName: global.ownerName,
  owner: global.owner,
  prefix: global.prefix,
  sessionDir: global.sessionDir,
  database: global.database,
  limitConfig: global.limitConfig,
  premiumConfig: global.premiumConfig,
  appearance: global.appearance
}
