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
  thumbUrl: "https://avatars.githubusercontent.com/u/218592586?v=4",
  theme: {
    gradient: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
    gradients: {
      success: ["#00C851", "#007E33"],
      error: ["#FF4444", "#CC0000"],
      warning: ["#FF8800", "#FF6600"],
      info: ["#33B5E5", "#0099CC"]
    },
    minWidth: 60, // Minimum width for terminal display
    maxWidth: 100, // Maximum width for terminal display
    box: { // Default box characters for cli-box
      cornerChar: "╔",
      horizontalChar: "═",
      verticalChar: "║"
    },
    // --- CLI Display Configuration ---
    cliDisplay: {
      header: {
        defaultFont: 'Bloody', // Default Figlet font for headers
        horizontalLayout: 'fitted', // 'default', 'fitted', 'full'
        whitespaceBreak: true, // Allow line breaks on whitespace
        mainHeaderWidth: 60, // Width for the main bot name header
        subHeaderWidth: 40,  // Width for sub-headers like "CONNECTED", "PAIRING CODE REQUIRED"
        footerWidth: 40,     // Width for the footer text
        // You can define specific fonts for different widths if needed
        // Example:
        // fontMap: [
        //   { width: 30, font: 'Small' },
        //   { width: 50, font: 'Standard' },
        //   { width: 70, font: 'Big' }
        // ]
      },
      infoBox: { // Configuration for the main info box
        width: 50, // Default width for the info box
        height: 8, // Default height for the info box
        marks: { // Box characters for the info box
          nw: '╔', n: '═', ne: '╗',
          e: '║', se: '╝', s: '═',
          sw: '╚', w: '║'
        }
      },
      pairingCodeBox: { // Configuration for the pairing code box
        width: 40, // Default width for the pairing code box
        height: 5, // Default height for the pairing code box
        marks: { // Box characters for the pairing code box
          nw: "╔", n: "═", ne: "╗",
          e: "║", se: "╝", s: "═",
          sw: "╚", w: "║",
        }
      }
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
