import "./lib/settings/config.js"
import fs from "fs"
import util from "util"
import chalk from "chalk"
import path from "path"
import { fileURLToPath } from "url"
import { loadPlugins, getCommands, canExecuteCommand, executeCommand } from "./lib/pluginLoader.js"
import gradient from "gradient-string"
import Table from "cli-table3"
import db from "./lib/database.js"
import { getWIBTime, getWIBDateTime, getGreeting } from "./lib/utils/time.js"; // Import fungsi waktu
import { getGroupAdmins } from "./lib/myfunction.js"; // Import getGroupAdmins dari myfunction.js

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//================= { REACT } =================\\
const moji = ["📚", "💭", "💫", "🌌", "🌏", "✨", "🌷", "🍁", "🪻"]
const randomemoji = () => moji[Math.floor(Math.random() * moji.length)]

// Create a formatted log table with gradient
const createLogTable = (data) => {
  const table = new Table({
    chars: {
      top: "═",
      "top-mid": "╤",
      "top-left": "╔",
      "top-right": "╗",
      bottom: "═",
      "bottom-mid": "╧",
      "bottom-left": "╚",
      "bottom-right": "╝",
      left: "║",
      "left-mid": "╟",
      mid: "─",
      "mid-mid": "┼",
      right: "║",
      "right-mid": "╢",
      middle: "│",
    },
    style: {
      head: ["cyan"],
      border: ["grey"],
      compact: true,
    },
  })

  const rows = []
  for (const [key, value] of Object.entries(data)) {
    rows.push([chalk.cyan(key), chalk.white(value)])
  }

  table.push(...rows)
  return table.toString()
}

// Load plugins
let plugins = {}
let commands = {}

// Initialize plugins
const initPlugins = async () => {
  try {
    const startTime = Date.now()
    console.log(chalk.yellow(`[${getWIBTime()}] Loading plugins...`))
    plugins = await loadPlugins() // loadPlugins now returns globalPlugins (categorized unique plugins)
    commands = getCommands(plugins) // getCommands now returns globalCommands (all commands including aliases)
    const loadTime = Date.now() - startTime

    // Count unique plugins from globalPlugins structure
    const uniquePluginCount = Object.values(plugins).reduce((acc, categoryPlugins) => acc + Object.keys(categoryPlugins).length, 0);
    // Count total commands (including aliases) from globalCommands
    const totalCommandCount = Object.keys(commands).length;

    const successGradient = gradient(global.appearance.theme.gradients.success)
    console.log(
      successGradient(
        `[${getWIBTime()}] Successfully loaded ${uniquePluginCount} unique plugins, providing ${totalCommandCount} commands in ${loadTime}ms`,
      ),
    )

    return uniquePluginCount // Return unique plugin count for consistency
  } catch (error) {
    const errorGradient = gradient(global.appearance.theme.gradients.error)
    console.error(errorGradient(`[${getWIBTime()}] Failed to load plugins:`), error)
    return 0
  }
}

// Function to reload plugins
export const reloadPlugins = async () => {
  return await initPlugins()
}

export default async (conn, m, chatUpdate, store) => {
  try {
    // Update the body parsing section
    var body =
      (m.mtype === "conversation"
        ? m.message?.conversation
        : m.mtype === "imageMessage"
          ? m.message?.imageMessage?.caption
          : m.mtype === "videoMessage"
            ? m.message?.videoMessage?.caption
            : m.mtype === "extendedTextMessage"
              ? m.message?.extendedTextMessage?.text
              : m.mtype === "buttonsResponseMessage"
                ? m.message?.buttonsResponseMessage?.selectedButtonId
                : m.mtype === "listResponseMessage"
                  ? m.message?.listResponseMessage?.singleSelectReply?.selectedRowId
                  : m.mtype === "templateButtonReplyMessage"
                    ? m.message?.templateButtonReplyMessage?.selectedId
                    : m.mtype === "interactiveResponseMessage"
                      ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
                      : m.mtype === "messageContextInfo"
                        ? m.message?.buttonsResponseMessage?.selectedButtonId ||
                          m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                          m.text
                        : "") || ""

    const budy = typeof m.text === "string" ? m.text : ""

    // Handle multi-prefix configuration
    let prefix = global.prefix.main
    let isCmd = false
    let command = ""

    if (global.prefix.multi) {
      for (const pfx of global.prefix.list) {
        if (body.startsWith(pfx)) {
          prefix = pfx
          isCmd = true
          command = body.slice(pfx.length).trim().split(" ").shift().toLowerCase()
          break
        }
      }
    } else {
      isCmd = body.startsWith(prefix)
      command = isCmd ? body.slice(prefix.length).trim().split(" ").shift().toLowerCase() : ""
    }

    const args = body.trim().split(/ +/).slice(1)
    const text = args.join(" ")
    const q = text

    // Add section for quoted message handling
    const fatkuns = m.quoted || m
    const quoted =
      fatkuns.mtype === "buttonsMessage"
        ? fatkuns[Object.keys(fatkuns)[1]]
        : fatkuns.mtype === "templateMessage"
          ? fatkuns.hydratedTemplate[Object.keys(fatkuns.hydratedTemplate)[1]]
          : fatkuns.mtype === "product"
            ? fatkuns[Object.keys(fatkuns)[0]]
            : m.quoted
              ? m.quoted
              : m
    const mime = (quoted.msg || quoted).mimetype || ""
    const qmsg = quoted.msg || quoted
    const isMedia = /image|video|sticker|audio/.test(mime)

    //================= { USER } =================\\
    const botNumber = await conn.decodeJid(conn.user.id)
    const ownerNumbers = global.owner.map((o) => o.number + "@s.whatsapp.net")

    const sender = m.key.fromMe
      ? conn.user.id.split(":")[0] + "@s.whatsapp.net" || conn.user.id
      : m.key.participant || m.key.remoteJid
    const senderNumber = sender.split("@")[0]

    const isOwner = ownerNumbers.includes(sender)
    const isDev = global.owner.some((o) => o.number === senderNumber && o.isDev)
    const itsMe = m.sender === botNumber ? true : false
    const isCreator = [botNumber, ...ownerNumbers].includes(m.sender)
    const pushname = m.pushName || `${senderNumber}`
    const isBot = botNumber.includes(senderNumber)

    //================= { GROUP } =================\\
    const isGroup = m.isGroup
    const groupMetadata = isGroup ? await conn.groupMetadata(m.chat).catch(() => null) : null
    const groupName = groupMetadata?.subject || ""
    const participants = isGroup ? groupMetadata?.participants || [] : []
    const groupAdmins = isGroup ? getGroupAdmins(participants) : "" // Menggunakan fungsi dari myfunction.js
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false
    const isAdmins = isGroup ? groupAdmins.includes(m.sender) : false
    const groupOwner = isGroup ? groupMetadata?.owner : ""
    const isGroupOwner = isGroup ? (groupOwner ? groupOwner : groupAdmins).includes(m.sender) : false

    // Fake thumbnail for fake messages
    const thumbUrl = global.appearance.thumbUrl; // Menggunakan thumbUrl dari config
// Custom reply function
const reply = async (teks) => {
  try {
    // Validasi input
    if (!teks || typeof teks !== 'string') {
      console.log('Invalid text provided to reply function:', teks);
      teks = 'Error: Invalid message content';
    }

    // Sanitasi text untuk menghindari error
    const sanitizedText = teks.toString().trim();
    
    if (sanitizedText.length === 0) {
      console.log('Empty text provided to reply function');
      return;
    }

    const HabBOTJob = {
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterName: `-Update HabBOT`,
          newsletterJid: `120363418350542994@newsletter`,
        },
        externalAdReply: {
          showAdAttribution: true,
          title: `HabBot - MD`,
          body: `${getGreeting()}`, // Menggunakan fungsi getGreeting
          thumbnailUrl: thumbUrl,
          sourceUrl: "",
        },
      },
      text: sanitizedText,
    };
    
    // Kirim pesan dan simpan hasilnya
    const sentMessage = await conn.sendMessage(m.chat, HabBOTJob, {
      quoted: m,
    });

    // --- Logika untuk menghapus pesan hanya untuk bot (pengirim) ---
    // Pastikan sentMessage memiliki key yang valid
    if (sentMessage && sentMessage.key) {
      await conn.sendMessage(m.chat, { delete: sentMessage.key });
      console.log('Pesan berhasil dikirim dan dihapus dari riwayat bot.');
    } else {
      console.log('Pesan berhasil dikirim, tetapi gagal menghapus dari riwayat bot (key tidak ditemukan).');
    }

  } catch (error) {
    console.error('Error in reply function:', error);
    // Tambahkan logika untuk menangani error, misalnya, memberi tahu pengguna
    try {
      await conn.sendMessage(m.chat, { text: `Terjadi kesalahan saat memproses permintaan Anda: ${error.message}` }, { quoted: m });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
};



    // Check if bot should respond based on mode (public or self)
    const shouldRespond = global.isPublic || isCreator || m.key.fromMe

    // If in self mode and not from owner, don't process the message
    if (!shouldRespond) return

    // Console logging with improved formatting
    if (m.message && isCmd) {
      const logData = {
        SENDER: pushname || "Unknown",
        JID: m.sender,
        ...(isGroup && { GROUP: groupName || "Unknown" }),
        COMMAND: `${prefix}${command}`,
        MODE: global.isPublic ? "public" : "self",
        TIMESTAMP: getWIBDateTime(),
      }

      console.log(createLogTable(logData))
    }

    //================= { PLUGIN COMMAND HANDLER } =================\\
    if (isCmd && commands[command]) {
      try {
        // Send a random emoji reaction
        await conn.sendMessage(m.chat, { react: { text: randomemoji(), key: m.key } })

        // Get plugin metadata and handler
        const { category, handler, metadata } = commands[command]

        // Check if command is owner-only
        if (metadata && metadata.owner && !isCreator) {
          console.log(chalk.yellow(`[${getWIBTime()}] [PLUGIN] Owner-only command ${command} attempted by non-owner`))
          return
        }

        // Check if command is for groups only
        if (metadata && metadata.group && !isGroup) {
          return reply("❌ Command ini hanya dapat digunakan di dalam grup!")
        }

        // Check if command is for admins only
        if (metadata && metadata.admin && !isAdmins) {
          return reply("❌ Command ini hanya dapat digunakan oleh admin grup!")
        }

        // Check if command requires bot to be admin
        if (metadata && metadata.botAdmin && !isBotAdmins) {
          return reply("❌ Bot harus menjadi admin untuk menggunakan command ini!")
        }

        // Check limit and premium
        const canExecute = canExecuteCommand(sender, command)
        if (!canExecute.canExecute) {
          return reply(canExecute.message)
        }

        // Execute command and deduct limit if needed
        executeCommand(sender, command)

        // Execute the plugin handler
        await handler(m, {
          conn,
          args,
          text,
          command,
          prefix,
          quoted,
          mime,
          isGroup,
          isOwner,
          sender,
          pushname,
          participants,
          groupMetadata,
          groupName,
          isAdmins,
          isBotAdmins,
          isCreator,
          botNumber,
          store,
          reply,
          db,
          isMedia,
          q
        })

        console.log(chalk.green(`[${getWIBTime()}] [PLUGIN] Executed ${category}/${command}`))
      } catch (error) {
        console.error(chalk.red(`[${getWIBTime()}] [PLUGIN] Error executing ${command}:`), error)
        reply(`❌ Error executing command: ${error.message}`)
      }
      return
    }

    // If command not found and has prefix, silently ignore
    if (isCmd) {
      console.log(chalk.yellow(`[${getWIBTime()}] Unknown command: ${command} from ${pushname}`))
    }
  } catch (err) {
    console.log(util.format(err))
  }
}

//================= { FILE WATCHER } =================\\
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`[${getWIBTime()}] Update ${__filename}`))
  import(`file://${__filename}?update=${Date.now()}`).catch(console.error)
})
