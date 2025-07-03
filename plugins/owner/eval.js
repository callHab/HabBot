import syntaxError from "syntax-error"
import util from "util"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
class CustomArray extends Array {
  constructor(...args) {
    // If the first argument is a number, limit it to a maximum of 10000 elements.
    if (typeof args[0] == "number") return super(Math.min(args[0], 10000))
    else return super(...args)
  }
}

/**
 * The main handler function for the eval command.
 * This function allows the bot owner to execute arbitrary JavaScript code.
 *
 * @param {object} m - The message object received by the bot.
 * @param {object} _2 
 * @param {object} _2.conn
 * @param {string[]} _2.args
 * @param {string} _2.body
 * @param {boolean} _2.isCreator
 * @param {object} _2.baileys
 */
const handler = async (m, _2) => {
  const { conn, args, body, isCreator, baileys } = _2

  // Security check: Only the bot creator can use this command.
  if (!isCreator) return

  let _return // Variable to store the result of the evaluated code.
  let _syntax = "" // Variable to store syntax error messages.

  // Determine the prefix used (">" or "=>").
  // "=>" implies a return statement is automatically added.
  const usedPrefix = body.startsWith("=>") ? "=>" : ">"
  // Extract the code by removing the prefix and trimming whitespace.
  const noPrefix = body.slice(usedPrefix.length).trim()
  // Prepare the text for evaluation: add "return " if "=>" prefix was used.
  const _text = (/^=/.test(usedPrefix) ? "return " : "") + noPrefix
  // Store the original value of m.exp (if it exists).
  // m.exp is not defined in the provided context, but might be a custom property for XP.
  const old = m.exp * 1

  try {
    let i = 15 // Counter to limit the number of 'print' calls to prevent spam.
    const f = {
      exports: {}, // A dummy module.exports object for the evaluated code.
    }

    // Create a new asynchronous function dynamically from the input string (_text).
    // This function will have specific variables injected into its scope.
    const exec = new (async () => {}).constructor(
      "print", // Custom function to print output to console and WhatsApp.
      "m", // The message object.
      "handler", // Reference to this handler function.
      "require", // Node.js 'require' function.
      "conn", // The Baileys connection object.
      "Array", // The CustomArray constructor (overrides native Array).
      "process", // Node.js 'process' object.
      "args", // Command arguments.
      "module", // The module object.
      "exports", // The exports object.
      "argument", // An array containing [conn, _2] for additional context.
      _text, // The actual JavaScript code to execute.
    )

    // Execute the dynamically created function.
    // 'conn' is set as the 'this' context for the evaluated code.
    _return = await exec.call(
      conn,
      // Implementation of the custom 'print' function.
      (...args) => {
        if (--i < 1) return // Stop printing after 15 calls.
        console.log(...args) // Log to the bot's console.
        // Send the formatted output back to the user in the chat.
        return conn.sendMessage(m.key.remoteJid, { text: util.format(...args) }, { quoted: m })
      },
      m,
      handler,
      // Dynamically create a 'require' function for the current module's context.
      (await import("module")).createRequire(import.meta.url),
      conn,
      CustomArray, // Pass CustomArray to be used when 'Array' is referenced in eval.
      process,
      args,
      f,
      f.exports,
      [conn, _2], // Pass additional arguments.
    )
  } catch (e) {
    // Catch and format syntax errors using the 'syntax-error' library.
    const err = syntaxError(_text, "Execution Function", {
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    })
    if (err) _syntax = "```" + err + "```\n\n"
    _return = e
  } finally {
    m.reply(_syntax + util.format(_return))
    m.exp = old
  }
}

handler.help = ["> ", "=> "]
handler.tags = ["owner"]
handler.command = ["eval"]

export default handler