// Node.js version check
const nodeVersion = process.versions.node.split(".")[0]
if (Number.parseInt(nodeVersion) < 20) {
  console.error("\x1b[31m%s\x1b[0m", "╔════════════════════════════════════════════════════════╗")
  console.error("\x1b[31m%s\x1b[0m", "║                   ERROR: NODE.JS VERSION               ║")
  console.error("\x1b[31m%s\x1b[0m", "╚════════════════════════════════════════════════════════╝")
  console.error("\x1b[31m%s\x1b[0m", `[ERROR] You are using Node.js v${process.versions.node}`)
  console.error("\x1b[31m%s\x1b[0m", "[ERROR] HabBOT - MD requires Node.js v20 or higher to run properly")
  console.error("\x1b[31m%s\x1b[0m", "[ERROR] Please update your Node.js installation and try again")
  console.error("\x1b[31m%s\x1b[0m", "[ERROR] Visit https://nodejs.org to download the latest version")
  console.error("\x1b[31m%s\x1b[0m", "╔════════════════════════════════════════════════════════╗")
  console.error("\x1b[31m%s\x1b[0m", "║                  SHUTTING DOWN...                      ║")
  console.error("\x1b[31m%s\x1b[0m", "╚════════════════════════════════════════════════════════╝")
  process.exit(1)
}

import baileys from "@whiskeysockets/baileys"
const {
  default: makeWASocket,
  DisconnectReason,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
  useMultiFileAuthState,
  downloadContentFromMessage,
  jidNormalizedUser,
} = baileys

import pino from "pino"
import { Boom } from "@hapi/boom"
import fs from "fs"
import path from "path"
import readline from "readline"
import PhoneNumber from "awesome-phonenumber"
import chalk from "chalk"
import { smsg } from "./lib/myfunction.js"
import cron from "node-cron"
import { fileURLToPath } from "url"
import caseHandler from "./habbot.js"
import { exec } from "child_process"
import figlet from "figlet" // Pastikan ini ada
import gradient from "gradient-string" // Pastikan ini ada
import Box from "cli-box" // Pastikan ini ada
import { getWIBTime, getWIBDate, getWIBDateTime } from "./lib/utils/time.js"; // Import fungsi waktu

// Load custom font for figlet
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
  require('figlet-fonts-bloody'); // Load custom font
} catch (e) {
  console.warn(chalk.yellow(`[WARNING] 'figlet-fonts-bloody' not found. Falling back to default font. Install with 'npm install figlet-fonts-bloody'`));
}


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import config
import "./lib/settings/config.js"

// ==================== [ UNIVERSAL HEADER GENERATOR ] ==================== //
const generateHeader = (text, width = 60) => {
  // Create gradient for header
  const headerGradient = gradient(['#ff0000', '#9900cc', '#ff0066']);
  
  // Generate ASCII art text
  const asciiText = figlet.textSync(text, {
    font: 'Bloody', // Use 'Bloody' font
    width: width,
    whitespaceBreak: true
  });

  // Add dynamic border based on width
  const border = '╔' + '═'.repeat(width - 2) + '╗';
  const timeInfo = `║ ${new Date().toLocaleString()} ║`.padEnd(width - 1) + '║';
  
  return headerGradient(
    `${border}\n` +
    `${asciiText}\n` +
    `${border}\n` +
    `${timeInfo}\n` +
    `${border.replace(/╔/g, '╚').replace(/╗/g, '╝').replace(/═/g, '═')}` // Replace corners for bottom border
  );
};

// ==================== [ BOT INTERFACE DISPLAY ] ==================== //
const displayBotInterface = () => {
  console.clear();
  
  // 1. Header utama dengan nama bot
  console.log(generateHeader(global.botName || 'HABBOT-MD'));
  
  // 2. Kotak informasi utama
  const infoBox = new Box({
    strify: false,
    width: 50,
    height: 8,
    marks: {
      nw: '╔', n: '═', ne: '╗',
      e: '║', se: '╝', s: '═',
      sw: '╚', w: '║'
    }
  }, {
    text: [
      ` ${chalk.bold('✧ VERSION:')} ${global.botVersion || '3.5.0'}`,
      ` ${chalk.bold('✧ OWNER:')} ${global.owner?.[0]?.name || 'H4bDev'}`,
      ` ${chalk.bold('✧ MODE:')} ${global.isPublic ? 'PUBLIC' : 'PRIVATE'}`,
      ` ${chalk.bold('✧ STATUS:')} ${chalk.green('STARTING...')}`, // Initial status
      ` ${chalk.bold('✧ THEME:')} BLOODY PURPLE`,
      '',
      ` ${chalk.italic('Type .menu for command list')}`
    ].join('\n')
  });

  console.log(gradient('#ff00ff', '#7700ff')(infoBox.stringify()));
  
  // 3. Footer dinamis
  const footerText = "⚡ POWERED BY H4BDEV ⚡";
  console.log(generateHeader(footerText, footerText.length + 10));
};


// Create necessary directories if they don't exist
const createDirectories = () => {
  const dirs = [
    "./lib",
    "./lib/settings",
    "./plugins",
    "./plugins/owner",
    "./plugins/info",
    "./tmp",
    "./database",
    "./session"
  ]
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(chalk.green(`[${getWIBTime()}] Created directory: ${dir}`))
    }
  })
}

createDirectories()

// Get terminal width for responsive display
const getTerminalWidth = () => {
  const columns = process.stdout.columns || 80
  const minWidth = global.appearance.theme.minWidth || 60
  const maxWidth = global.appearance.theme.maxWidth || 100
  return Math.max(minWidth, Math.min(columns, maxWidth))
}

// Initialize store
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) })

const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

// Get session directory from config
const SESSION_DIR = globalThis.sessionDir || "./session"

// Create session directory if it doesn't exist
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true })
  console.log(chalk.green(`[${getWIBTime()}] Created session directory: ${SESSION_DIR}`))
}

// Bot mode (public or self)
global.isPublic = true

// Replace the authentication initialization with the new utility
import { initAuthState } from "./lib/index.js"

// Modify the startBot function to support different authentication methods
async function startBot() {
  try {
    // First, display the new bot interface
    displayBotInterface();

    // Initialize authentication state
    console.log(chalk.cyan(`[${getWIBTime()}] Initializing authentication state...`))
    const { state, saveCreds } = await initAuthState(SESSION_DIR)

    console.log(chalk.cyan(`[${getWIBTime()}] Creating WhatsApp connection...`))
    const conn = makeWASocket({
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
    })

    // Pairing code logic
    let phoneNumber
    let code
    let pairingCodeRequested = false

    // Function to request pairing code
    const requestPairingCode = async () => {
      try {
        console.log(generateHeader("PAIRING CODE REQUIRED", 40)); // Use new header
        phoneNumber = await question(
          chalk.cyan(`[${getWIBTime()}] Enter your WhatsApp number starting with country code (e.g., 62xxx): `),
        )

        if (phoneNumber) {
          console.log(chalk.yellow(`[${getWIBTime()}] Requesting pairing code for ${phoneNumber}...`))
          code = await conn.requestPairingCode(phoneNumber)
          code = code?.match(/.{1,4}/g)?.join("-") || code
          pairingCodeRequested = true
        }
      } catch (error) {
        console.error(chalk.red(`[${getWIBTime()}] Error requesting pairing code:`), error)
      }
    }

    // Function to display pairing code with gradient
    const displayPairingCode = () => {
      if (pairingCodeRequested && code) {
        const termWidth = getTerminalWidth()

        const boxConfig = {
          w: Math.min(40, termWidth - 10),
          h: 5,
          stringify: false,
          marks: {
            nw: "╔",
            n: "═",
            ne: "╗",
            e: "║",
            se: "╝",
            s: "═",
            sw: "╚",
            w: "║",
          },
          hAlign: "center",
          vAlign: "middle",
        }

        const titleBoxConfig = { ...boxConfig, h: 3 }
        const titleBox = new Box(titleBoxConfig, "PAIRING CODE")
        console.log(gradient(['#ff0000', '#9900cc', '#ff0066'])(titleBox.stringify())) // Use gradient

        const codeBox = new Box(boxConfig, code)
        console.log(gradient(['#ff0000', '#9900cc', '#ff0066'])(codeBox.stringify())) // Use gradient

        console.log(chalk.cyan(`[${getWIBTime()}] Enter this code in your WhatsApp app to pair your device`))
        console.log(chalk.yellow(`[${getWIBTime()}] Waiting for connection...\n`))
      }
    }

    // Check if registration is required and request pairing code
    if (!conn.authState.creds.registered) {
      await requestPairingCode()
      displayPairingCode()
    }

    store.bind(conn.ev)

    conn.ev.on("messages.upsert", async (chatUpdate) => {
      try {
        const mek = chatUpdate.messages[0]
        if (!mek.message) return
        mek.message =
          Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message
        if (mek.key && mek.key.remoteJid === "status@broadcast") return
        if (!conn.public && !mek.key.fromMe && chatUpdate.type === "notify") return
        if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return

        const m = smsg(conn, mek, store)
        caseHandler(conn, m, chatUpdate, store)
      } catch (err) {
        console.log(chalk.red(`[${getWIBTime()}] Error processing message:`), err)
      }
    })

    // Utility functions
    conn.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {}
        return (decode.user && decode.server && decode.user + "@" + decode.server) || jid
      } else return jid
    }

    conn.getName = (jid, withoutContact = false) => {
      const id = conn.decodeJid(jid)
      withoutContact = conn.withoutContact || withoutContact
      let v
      if (id.endsWith("@g.us"))
        return new Promise(async (resolve) => {
          v = store.contacts[id] || {}
          if (!(v.name || v.subject)) v = conn.groupMetadata(id) || {}
          resolve(
            v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"),
          )
        })
      else
        v =
          id === "0@s.whatsapp.net"
            ? { id, name: "WhatsApp" }
            : id === conn.decodeJid(conn.user.id)
              ? conn.user
              : store.contacts[id] || {}
      return (
        (withoutContact ? "" : v.name) ||
        v.subject ||
        v.verifiedName ||
        PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international")
      )
    }

    // Set public mode from config
    conn.public = global.isPublic
    conn.serializeM = (m) => smsg(conn, m, store)

    conn.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode
        if (
          reason === DisconnectReason.badSession ||
          reason === DisconnectReason.connectionClosed ||
          reason === DisconnectReason.connectionLost ||
          reason === DisconnectReason.connectionReplaced ||
          reason === DisconnectReason.restartRequired ||
          reason === DisconnectReason.timedOut
        ) {
          console.log(chalk.yellow(`[${getWIBTime()}] Reconnecting...`))
          startBot()
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(
            chalk.red(`[${getWIBTime()}] Session logged out, please delete the session folder and scan again.`),
          )
        } else {
          console.log(chalk.red(`[${getWIBTime()}] Unknown DisconnectReason: ${reason}|${connection}`))
        }
      } else if (connection === "open") {
        console.log(generateHeader("CONNECTED", 40)); // Use new header for CONNECTED

        const boxConfig = {
          w: getTerminalWidth() - 10,
          h: 7,
          stringify: false,
          marks: {
            nw: "╔",
            n: "═",
            ne: "╗",
            e: "║",
            se: "╝",
            s: "═",
            sw: "╚",
            w: "║",
          },
          hAlign: "left",
          vAlign: "middle",
        }

        const connectionInfo = [
          `Bot ID: ${conn.user.id}`,
          `Mode: ${conn.public ? "public" : "self"}`,
          `Time: ${getWIBDateTime()}`,
          `Timezone: ${global.appearance.timezone || "Asia/Jakarta"}`,
          `Status: Online and Ready`,
        ].join("\n")

        const infoBox = new Box(boxConfig, connectionInfo)
        console.log(gradient(['#ff00ff', '#7700ff'])(infoBox.stringify())) // Use gradient

        console.log(chalk.green(`[${getWIBTime()}] Bot connected successfully!`))

        // Initialize plugins after connection
        console.log(chalk.yellow(`\n[${getWIBTime()}] Initializing plugins...`))
        import("./habbot.js")
          .then((module) => {
            module.reloadPlugins().then((count) => {
              console.log(chalk.green(`[${getWIBTime()}] Loaded ${count} plugins`))

              const successGradient = gradient(global.appearance.theme.gradients.success)
              console.log(successGradient(`\n[${getWIBTime()}] ${global.botName} is now fully operational!`))
            })
          })
          .catch((err) => {
            console.error(chalk.red(`[${getWIBTime()}] Error loading plugins:`), err)
          })
      }
    })

    conn.ev.on("creds.update", saveCreds)

    conn.sendText = (jid, text, quoted = "", options) => conn.sendMessage(jid, { text: text, ...options }, { quoted })

    conn.downloadMediaMessage = async (message) => {
      const mime = (message.msg || message).mimetype || ""
      const messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0]
      try {
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
      } catch (e) {
        console.error(chalk.red(`[${getWIBTime()}] Error downloading media:`), e)
        return null
      }
    }

    return conn
  } catch (error) {
    console.error(chalk.red(`[${getWIBTime()}] Error starting bot:`), error)
    throw error
  }
}

// Start the bot immediately
startBot().catch((err) => console.log(chalk.red(`[${getWIBTime()}] Fatal error:`), err))

// Watch for file changes in index.js
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`[${getWIBTime()}] Update ${__filename}`))
  console.log(chalk.yellow(`[${getWIBTime()}] Restarting bot...`))
  process.exit()
})
