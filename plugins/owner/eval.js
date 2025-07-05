import syntaxError from "syntax-error"
import util from "util"
import { fileURLToPath } from "url"
import fs from "fs"
import { exec as shellExec } from "child_process"

const __filename = fileURLToPath(import.meta.url)

class CustomArray extends Array {
  constructor(...args) {
    if (typeof args[0] == "number") return super(Math.min(args[0], 10000))
    else return super(...args)
  }
}

const handler = async (m, { conn, args, body, isCreator, reply }) => {
  if (!isCreator) return

  let _return
  let _syntax = ""
  let codeToExecute = ""
  let isShellCommand = false

  // Tentukan prefiks utama
  const prefix = global.prefix.main

  // Cek prefiks dan ambil kode yang akan dieksekusi
  if (body.startsWith(`${prefix}>`)) {
    codeToExecute = body.slice(`${prefix}>`.length).trim()
  } else if (body.startsWith(`${prefix}=>`)) {
    codeToExecute = "return " + body.slice(`${prefix}=>`.length).trim()
  } else if (body.startsWith(`${prefix}$`)) {
    isShellCommand = true
    codeToExecute = body.slice(`${prefix}$`.length).trim()
  } else if (body.startsWith(`${prefix}eval`)) {
    if (args.length === 0) {
      return reply("Silakan berikan kode JavaScript atau perintah shell untuk dieksekusi.\n\nContoh:\n`> console.log('Hello')`\n`=> 'Hello World'`\n`$ ls -la`")
    }
    codeToExecute = args.join(" ")
  } else {
    return reply("Prefiks tidak dikenal untuk perintah eval. Gunakan `.` `>` `=>` atau `$`")
  }

  if (!codeToExecute) {
    return reply("Tidak ada kode atau perintah yang diberikan untuk dieksekusi.")
  }

  // --- Eksekusi Perintah Shell ---
  if (isShellCommand) {
    try {
      _return = await new Promise((resolve, reject) => {
        shellExec(codeToExecute, (error, stdout, stderr) => {
          if (error) {
            reject(`Error: ${error.message}\nStderr: ${stderr}`)
            return
          }
          if (stderr) {
            resolve(`Stderr: ${stderr}`)
            return
          }
          resolve(stdout)
        })
      })
    } catch (e) {
      _return = e
    } finally {
      reply(util.format(_return))
    }
    return
  }

  const old = m.exp * 1

  try {
    let i = 15
    const f = {
      exports: {},
    }

    const exec = new (async () => {}).constructor(
      "print",
      "m",
      "handler",
      "require",
      "conn",
      "Array",
      "process",
      "args",
      "module",
      "exports",
      "argument",
      codeToExecute,
    )

    _return = await exec.call(
      conn,
      (...args) => {
        if (--i < 1) return
        console.log(...args)
        return conn.sendMessage(m.key.remoteJid, { text: util.format(...args) }, { quoted: m })
      },
      m,
      handler,
      (await import("module")).createRequire(import.meta.url),
      conn,
      CustomArray,
      process,
      args,
      f,
      f.exports,
      [conn, _2],
    )
  } catch (e) {
    const err = syntaxError(codeToExecute, "Execution Function", {
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