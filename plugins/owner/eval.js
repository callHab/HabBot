import syntaxError from "syntax-error";
import util from "util";
import { fileURLToPath } from "url";
import fs from "fs";
import { exec as shellExec } from "child_process";

const __filename = fileURLToPath(import.meta.url);

class CustomArray extends Array {
  constructor(...args) {
    if (typeof args[0] === "number") return super(Math.min(args[0], 10000));
    return super(...args);
  }
}

const handler = async (m, { conn, args, text = "", body = "", command, isCreator, reply }) => {
  if (!isCreator) return;

  let _return;
  let _syntax = "";
  let codeToExecute = "";
  let isShellCommand = false;

  // STANDARDISASI INPUT - prioritaskan body, lalu text, terakhir args
  const getInput = () => {
    if (typeof body === 'string' && body.trim()) return body;
    if (typeof text === 'string' && text.trim()) return text;
    return args.join(' ').trim();
  };

  const inputText = getInput();

  // DETEKSI COMMAND DENGAN PENANGANAN KHUSUS
  const detectCommandType = (input) => {
    if (!input) return null;
    
    // Cek prefix secara eksplisit
    if (input.startsWith("=>")) {
      return { type: "return", code: input.slice(2).trim() };
    } else if (input.startsWith(">")) {
      return { type: "exec", code: input.slice(1).trim() };
    } else if (input.startsWith("$")) {
      return { type: "shell", code: input.slice(1).trim() };
    }
    return { type: "eval", code: input.trim() };
  };

  const commandType = detectCommandType(inputText);

  // TAMPILAN HELP JIKA TIDAK ADA INPUT
  if (!commandType.code) {
    const helpMsg = [
      "📝 *EVAL MENU* [[v3.0]]",
      "",
      "▸ `> code`    : Eksekusi kode JavaScript",
      "▸ `=> expr`   : Return nilai ekspresi",
      "▸ `$ command` : Eksekusi shell command",
      "▸ `.eval code`: Alias evaluasi kode",
      "",
      "Contoh:",
      "> 2+2",
      "=> [1,2,3].map(x=>x*2)",
      "$ ls -la"
    ].join("\n");
    return reply(helpMsg);
  }

  // PROSES BERDASARKAN JENIS COMMAND
  switch (commandType.type) {
    case "return":
      codeToExecute = `return ${commandType.code}`;
      break;
    case "exec":
      codeToExecute = commandType.code;
      break;
    case "shell":
      isShellCommand = true;
      codeToExecute = commandType.code;
      break;
    case "eval":
      codeToExecute = commandType.code;
      break;
  }

  // EKSEKUSI SHELL COMMAND
  if (isShellCommand) {
    try {
      _return = await new Promise((resolve, reject) => {
        shellExec(codeToExecute, (error, stdout, stderr) => {
          if (error) {
            reject(`❌ Error: ${error.message}\n${stderr || ""}`);
          } else {
            resolve(stdout || "✅ Command executed (no output)");
          }
        });
      });
    } catch (e) {
      _return = e;
    }
    return reply(`💻 *Shell Output:*\n${typeof _return === "string" ? _return : util.format(_return)}`);
  }

  // PREPARE EXECUTION CONTEXT
  const ctx = {
    console,
    m,
    conn,
    reply,
    Array: CustomArray,
    require: (module) => {
      if (module === './__filename') return __filename;
      return require(module);
    },
    import: (module) => import(module),
    process,
    Buffer,
    __filename,
    fs,
    util
  };

  try {
    // SYNTAX CHECK
    const execCode = codeToExecute.startsWith("return") 
      ? codeToExecute 
      : `return (async () => { ${codeToExecute} })()`;
    
    const syntaxCheck = syntaxError(execCode, __filename);
    
    if (syntaxCheck) {
      _syntax = `❌ Syntax Error:\n${syntaxCheck.toString().replace(__filename, "eval")}`;
    } else {
      // EXECUTE CODE
      const fn = new Function(...Object.keys(ctx), execCode);
      _return = await fn(...Object.values(ctx));
      
      if (_return === undefined) {
        _return = "✅ Code executed (no return value)";
      }
    }
  } catch (e) {
    _return = `❌ Execution Error:\n${e.stack}`;
  }

  // FORMAT OUTPUT
  const formatOutput = (str, maxLength = 600) => 
    str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;

  const output = [
    _syntax ? `${_syntax}\n\n` : "",
    `📝 *Input:*\n\`\`\`javascript\n${formatOutput(codeToExecute)}\n\`\`\`\n\n`,
    `📤 *Output:*\n\`\`\`javascript\n${formatOutput(util.format(_return))}\n\`\`\``
  ].join("");

  await reply(output);
};

handler.help = ['eval <code>'];
handler.tags = ['owner'];
handler.command = /^(>|\=>|\$|eval)/i;
handler.owner = true;

export default handler;