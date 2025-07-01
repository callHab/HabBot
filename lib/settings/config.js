/**
 * Bot Configuration
 * Konfigurasi utama bot WhatsApp
 */

// Bot Information
global.botName = "HabBOT - MD"
global.botVersion = "3.5.0"
global.ownerName = "H4bDev"
global.packname = "HabBOT Sticker"
global.author = "087856546952"

// Owner Configuration
global.owner = [
  {
    number: "6287897624642", // Ganti dengan nomor owner
    name: "H4bDev",
    isDev: true
  }
]

// Prefix Configuration
global.prefix = {
  main: ".",
  multi: false,
  list: [".", "#", "!", "/", "\\"]
}

// Session Configuration
global.sessionDir = "./session"
global.sessionCleanupInterval = 8 // hours

// Database Configuration
global.database = {
  users: "./database/users.json",
  commands: "./database/commands.json"
}

// Limit Configuration
global.limitConfig = {
  defaultLimit: 20,
  resetInterval: "daily", // daily, hourly
  resetTime: "00:00" // for daily reset
}

// Premium Configuration
global.premiumConfig = {
  unlimitedLimit: true,
  premiumCommands: []
}

// Appearance Configuration
global.appearance = {
  timezone: "Asia/Jakarta",
  timeFormat: "HH:mm:ss",
  dateFormat: "DD/MM/YYYY",
  fullDateFormat: "DD/MM/YYYY HH:mm:ss",
  thumbUrl: "https://avatars.githubusercontent.com/u/218592586?v=4", // Tambahkan ini
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
    }
  }
}

// Auto-restart on config change
import fs from "fs"
import { fileURLToPath } from "url"
import chalk from "chalk"

const __filename = fileURLToPath(import.meta.url)

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`[CONFIG] Configuration updated, restarting...`))
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
