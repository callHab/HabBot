// Node.js version check
const nodeVersion = process.versions.node.split(".")[0];
if (Number.parseInt(nodeVersion) < 20) {
  console.error("\x1b[31m%s\x1b[0m", "╔════════════════════════════════════════════════════════╗");
  console.error("\x1b[31m%s\x1b[0m", "║                   ERROR: NODE.JS VERSION               ║");
  console.error("\x1b[31m%s\x1b[0m", "╚════════════════════════════════════════════════════════╝");
  console.error("\x1b[31m%s\x1b[0m", `[ERROR] You are using Node.js v${process.versions.node}`);
  console.error("\x1b[31m%s\x1b[0m", "[ERROR] HabBOT - MD requires Node.js v20 or higher to run properly");
  console.error("\x1b[31m%s\x1b[0m", "[ERROR] Please update your Node.js installation and try again");
  console.error("\x1b[31m%s\x1b[0m", "[ERROR] Visit https://nodejs.org to download the latest version");
  console.error("\x1b[31m%s\x1b[0m", "╔════════════════════════════════════════════════════════╗");
  console.error("\x1b[31m%s\x1b[0m", "║                  SHUTTING DOWN...                      ║");
  console.error("\x1b[31m%s\x1b[0m", "╚════════════════════════════════════════════════════════╝");
  process.exit(1);
}

import baileys from "@whiskeysockets/baileys";
const {
  default: makeWASocket,
  DisconnectReason,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
  useMultiFileAuthState,
  downloadContentFromMessage,
  jidNormalizedUser ,
} = baileys;

import pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import readline from "readline";
import PhoneNumber from "awesome-phonenumber";
import chalk from "chalk";
import { smsg } from "./lib/myfunction.js";
import cron from "node-cron";
import { fileURLToPath } from "url";
import caseHandler from "./habbot.js";
import { exec } from "child_process";
import figlet from "figlet";
import gradient from "gradient-string";
import Box from "cli-box";
import { getWIBTime, getWIBDate, getWIBDateTime } from "./lib/utils/time.js";

// Load custom font for figlet
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
  require('figlet-fonts-bloody'); // Load custom font
} catch (e) {
  console.warn(chalk.yellow(`[WARNING] 'figlet-fonts-bloody' not found. Falling back to default font. Install with 'npm install figlet-fonts-bloody'`));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import config (pastikan ini di-load sebelum digunakan)
import "./lib/settings/config.js";

// ==================== [ UNIVERSAL HEADER GENERATOR ] ==================== //
const generateHeader = (text, width) => {
  const headerConfig = global.appearance.theme.cliDisplay.header;
  const actualWidth = width || headerConfig.mainHeaderWidth; // Use provided width or mainHeaderWidth as default
  const selectedFont = headerConfig.defaultFont; // Use default font from config
  const horizontalLayout = headerConfig.horizontalLayout;
  const whitespaceBreak = headerConfig.whitespaceBreak;

  const headerGradient = gradient(['#ff0000', '#9900cc', '#ff0066']);
  
  const asciiText = figlet.textSync(text, {
    font: selectedFont,
    width: actualWidth,
    horizontalLayout: horizontalLayout,
    whitespaceBreak: whitespaceBreak
  });

  // Calculate dynamic border length based on actual rendered ASCII text width
  const renderedWidth = asciiText.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
  const borderLength = Math.max(renderedWidth, actualWidth);

  const border = '╔' + '═'.repeat(borderLength - 2) + '╗';
  const timeInfo = `║ ${new Date().toLocaleString()} ║`.padEnd(borderLength - 1) + '║';
  
  return headerGradient(
    `${border}\n` +
    `${asciiText}\n` +
    `${border}\n` +
    `${timeInfo}\n` +
    `${border.replace(/╔/g, '╚').replace(/╗/g, '╝').replace(/═/g, '═')}`
  );
};

// ==================== [ BOT INTERFACE DISPLAY ] ==================== //
const displayBotInterface = () => {
  console.clear();
  
  const cliDisplayConfig = global.appearance.theme.cliDisplay;

  // 1. Header utama dengan nama bot
  console.log(generateHeader(global.botName || 'HABBOT-MD', cliDisplayConfig.header.mainHeaderWidth));
  
  // 2. Kotak informasi utama
  const infoBoxConfig = cliDisplayConfig.infoBox;
  const infoBox = new Box({
    w: infoBoxConfig.width,
    h: infoBoxConfig.height,
    marks: infoBoxConfig.marks
  }, [
    ` ${chalk.bold('✧ VERSION:')} ${global.botVersion || '3.5.0'}`,
    ` ${chalk.bold('✧ OWNER:')} ${global.owner?.[0]?.name || 'H4bDev'}`,
    ` ${chalk.bold('✧ MODE:')} ${global.isPublic ? 'PUBLIC' : 'PRIVATE'}`,
    ` ${chalk.bold('✧ STATUS:')} ${chalk.green('STARTING...')}`, // Initial status
    ` ${chalk.bold('✧ THEME:')} BLOODY PURPLE`,
    '',
    ` ${chalk.italic('Type .menu for command list')}`
  ].join('\n'));

  console.log(gradient('#ff00ff', '#7700ff')(infoBox.string));
  
  // 3. Footer dinamis
  const footerText = "⚡ POWERED BY H4BDEV ⚡";
  console.log(generateHeader(footerText, cliDisplayConfig.header.footerWidth));
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
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.green(`[${getWIBTime()}] Created directory: ${dir}`));
    }
  });
};

createDirectories();

// Get terminal width for responsive display
const getTerminalWidth = () => {
  const columns = process.stdout.columns || 80;
  const minWidth = global.appearance.theme.minWidth || 60;
  const maxWidth = global.appearance.theme.maxWidth || 100;
  return Math.max(minWidth, Math.min(columns, maxWidth));
};

// Initialize store
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

// Get session directory from config
const SESSION_DIR = globalThis.sessionDir || "./session";

// Create session directory if it doesn't exist
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  console.log(chalk.green(`[${getWIBTime()}] Created session directory: ${SESSION_DIR}`));
}

// Bot mode (public or self)
global.isPublic = true;

// Replace the authentication initialization with the new utility
import { initAuthState } from "./lib/index.js";

// Modify the startBot function to support different authentication methods
async function startBot() {
  try {
    // Pastikan config sudah di-load sebelum memanggil displayBotInterface
    // Ini penting karena displayBotInterface menggunakan nilai dari global.appearance
    // import "./lib/settings/config.js"; // Sudah di-import di bagian atas file

    // First, display the new bot interface
    displayBotInterface();

    // Initialize authentication state
    console.log(chalk.cyan(`[${getWIBTime()}] Initializing authentication state...`));
    const { state, saveCreds } = await initAuthState(SESSION_DIR);

    console.log(chalk.cyan(`[${getWIBTime()}] Creating WhatsApp connection...`));
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
    });

    // Pairing code logic
    let phoneNumber;
    let code;
    let pairingCodeRequested = false;

    // Function to request pairing code
    const requestPairingCode = async () => {
      try {
        const headerConfig = global.appearance.theme.cliDisplay.header;
        console.log(generateHeader("PAIRING CODE REQUIRED", headerConfig.subHeaderWidth));
        phoneNumber = await question(
          console.log(chalk.cyan(`[${getWIBTime()}] Enter your WhatsApp number starting with country code (e.g., 62xxx): `),
        ));

        if (phoneNumber) {
          console.log(chalk.yellow(`[${getWIBTime()}] Requesting pairing code for ${phoneNumber}...`));
          const customPairingCode = "HABBOTMD"; // 8 CHARACTER
          const code = await conn.requestPairingCode(phoneNumber, customPairingCode);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          pairingCodeRequested = true;
        }
      } catch (error) {
        console.error(chalk.red(`[${getWIBTime()}] Error requesting pairing code:`), error);
      }
    };

    // Function to display pairing code with gradient
    const displayPairingCode = () => {
      if (pairingCodeRequested && code) {
        const termWidth = getTerminalWidth();
        const pairingCodeBoxConfig = global.appearance.theme.cliDisplay.pairingCodeBox;

        const boxConfig = {
          w: Math.min(pairingCodeBoxConfig.width, termWidth - 10),
          h: pairingCodeBoxConfig.height,
          stringify: false,
          marks: pairingCodeBoxConfig.marks,
          hAlign: "center",
          vAlign: "middle",
        };

        const titleBoxConfig = { ...boxConfig, h: 3 };
        const titleBox = new Box(titleBoxConfig, "PAIRING CODE");
        console.log(gradient(['#ff0000', '#9900cc', '#ff0066'])(titleBox.stringify()));

        const codeBox = new Box(boxConfig, code);
        console.log(gradient(['#ff0000', '#9900cc', '#ff0066'])(codeBox.stringify()));

        console.log(chalk.cyan(`[${getWIBTime()}] Enter this code in your WhatsApp app to pair your device`));
        console.log(chalk.yellow(`[${getWIBTime()}] Waiting for connection...\n`));
      }
    };

    // Check if registration is required and request pairing code
    if (!conn.authState.creds.registered) {
      await requestPairingCode();
      displayPairingCode();
    }

    store.bind(conn.ev);

    conn.ev.on("messages.upsert", async (chatUpdate) => {
      try {
        const mek = chatUpdate.messages[0];
        if (!mek.message) return;
        mek.message =
          Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === "status@broadcast") return;
        if (!conn.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
        if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return;

        const m = smsg(conn, mek, store);
        caseHandler(conn, m, chatUpdate, store);
      } catch (err) {
        console.log(chalk.red(`[${getWIBTime()}] Error processing message:`), err);
      }
    });

    // Utility functions
    conn.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {};
        return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
      } else return jid;
    };

    conn.getName = (jid, withoutContact = false) => {
      const id = conn.decodeJid(jid);
      withoutContact = conn.withoutContact || withoutContact;
      let v;
      if (id.endsWith("@g.us"))
        return new Promise(async (resolve) => {
          v = store.contacts[id] || {};
          if (!(v.name || v.subject)) v = conn.groupMetadata(id) || {};
          resolve(
            v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"),
          );
        });
      else
        v =
          id === "0@s.whatsapp.net"
            ? { id, name: "WhatsApp" }
            : id === conn.decodeJid(conn.user.id)
              ? conn.user
              : store.contacts[id] || {};
      return (
        (withoutContact ? "" : v.name) ||
        v.subject ||
        v.verifiedName ||
        PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international")
      );
    };

    // Set public mode from config
    conn.public = global.isPublic;
    conn.serializeM = (m) => smsg(conn, m, store);

    conn.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (
          reason === DisconnectReason.badSession ||
          reason === DisconnectReason.connectionClosed ||
          reason === DisconnectReason.connectionLost ||
          reason === DisconnectReason.connectionReplaced ||
          reason === DisconnectReason.restartRequired ||
          reason === DisconnectReason.timedOut
        ) {
          console.log(chalk.yellow(`[${getWIBTime()}] Reconnecting...`));
          startBot();
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(
            chalk.red(`[${getWIBTime()}] Session logged out, please delete the session folder and scan again.`),
          );
        } else {
          console.log(chalk.red(`[${getWIBTime()}] Unknown DisconnectReason: ${reason}|${connection}`));
        }
      } else if (connection === "open") {
        const headerConfig = global.appearance.theme.cliDisplay.header;
        console.log(generateHeader("CONNECTED", headerConfig.subHeaderWidth));

        const boxConfig = {
          w: getTerminalWidth() - 10, // Responsive width
          h: 7, // Fixed height for connection info box
          stringify: false,
          marks: global.appearance.theme.box, // Use general box marks from config
          hAlign: "left",
          vAlign: "middle",
        };

        const connectionInfo = [
          `Bot ID: ${conn.user.id}`,
          `Mode: ${conn.public ? "public" : "self"}`,
          `Time: ${getWIBDateTime()}`,
          `Timezone: ${global.appearance.timezone || "Asia/Jakarta"}`,
          `Status: Online and Ready`,
        ].join("\n");

        const infoBox = new Box(boxConfig, connectionInfo);
        console.log(gradient(['#ff00ff', '#7700ff'])(infoBox.stringify()));

        console.log(chalk.green(`[${getWIBTime()}] Bot connected successfully!`));

        // Initialize plugins after connection
        console.log(chalk.yellow(`\n[${getWIBTime()}] Initializing plugins...`));
        import("./habbot.js")
          .then((module) => {
            module.reloadPlugins().then((count) => {
              console.log(chalk.green(`[${getWIBTime()}] Loaded ${count} plugins`));

              const successGradient = gradient(global.appearance.theme.gradients.success);
              console.log(successGradient(`\n[${getWIBTime()}] ${global.botName} is now fully operational!`));
            });
          })
          .catch((err) => {
            console.error(chalk.red(`[${getWIBTime()}] Error loading plugins:`), err);
          });
      }
    });

    conn.ev.on("creds.update", saveCreds);

    conn.sendText = (jid, text, quoted = "", options) => conn.sendMessage(jid, { text: text, ...options }, { quoted });

    conn.downloadMediaMessage = async (message) => {
      const mime = (message.msg || message).mimetype || "";
      const messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
      try {
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
      } catch (e) {
        console.error(chalk.red(`[${getWIBTime()}] Error downloading media:`), e);
        return null;
      }
    };

    return conn;
  } catch (error) {
    console.error(chalk.red(`[${getWIBTime()}] Error starting bot:`), error);
    throw error;
  }
}

// Start the bot immediately
startBot().catch((err) => console.log(chalk.red(`[${getWIBTime()}] Fatal error:`), err));

// Watch for file changes in index.js
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`[${getWIBTime()}] Update ${__filename}`));
  console.log(chalk.yellow(`[${getWIBTime()}] Restarting bot...`));
  process.exit();
});
