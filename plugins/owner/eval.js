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

const handler = async (m, { conn, args, body = "", command, isCreator, reply }) => {
  if (!isCreator) return;

  let _return;
  let _syntax = "";
  let codeToExecute = "";
  let isShellCommand = false;
  let inputSource = "";

  // Normalisasi input
  const inputText = (() => {
    if (typeof body === 'string' && body.trim()) {
      inputSource = 'body';
      return body.trim();
    }
    if (args.length > 0) {
      inputSource = 'args';
      return args.join(' ').trim();
    }
    return '';
  })();

  // Deteksi perintah
  if (!inputText) {
    return reply("📝 *EVAL MENU* [[v2.0]]\n\n▸ `> code`    : Eksekusi kode JavaScript\n▸ `=> expr`   : Return nilai ekspresi\n▸ `$ command` : Eksekusi shell command\n▸ `.eval code`: Alias evaluasi kode\n\nContoh:\n> 2+2\n=> [1,2,3].map(x=>x*2)\n$ ls -la");
  }

  if (inputText.startsWith("=>")) {
    codeToExecute = `return ${inputText.slice(2).trim()}`;
  } else if (inputText.startsWith(">")) {
    codeToExecute = inputText.slice(1).trim();
  } else if (inputText.startsWith("$")) {
    isShellCommand = true;
    codeToExecute = inputText.slice(1).trim();
  } else if (command === "eval" && inputSource === 'args') {
    codeToExecute = inputText;
  } else {
    // Default treatment as JS code if no prefix but from eval command
    codeToExecute = inputText;
  }

  if (!codeToExecute.trim()) {
    return reply("❌ Tidak ada kode/perintah yang diberikan!");
  }

  if (isShellCommand) {
    try {
      _return = await new Promise((resolve, reject) => {
        shellExec(codeToExecute, (error, stdout, stderr) => {
          if (error) {
            reject("❌ Error: " + error.message + "\n" + (stderr || ""));
          } else {
            resolve(stdout || "✅ Command executed (no output)");
          }
        });
      });
    } catch (e) {
      _return = e;
    }
    return reply("💻 *Shell Output:*\n" + 
        (typeof _return === "string" ? _return : util.format(_return))
    );
  }

  // Prepare execution context
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
    // Check for syntax errors first
    const syntaxCheck = syntaxError(
      codeToExecute.startsWith("return") ? codeToExecute : `return (async () => { ${codeToExecute} })()`, 
      __filename
    );
    
    if (syntaxCheck) {
      _syntax = "❌ Syntax Error:\n" + syntaxCheck.toString().replace(__filename, "eval");
    } else {
      // Execute the code
      const fn = new Function(...Object.keys(ctx), 
        codeToExecute.startsWith("return") 
          ? codeToExecute 
          : `return (async () => { ${codeToExecute} })()`
      );
      
      _return = await fn(...Object.values(ctx));
      
      if (_return === undefined) {
        _return = "✅ Code executed (no return value)";
      }
    }
  } catch (e) {
    _return = "❌ Execution Error:\n" + e.stack;
  }

  // Format the output
  let output = "";
  if (_syntax) output += _syntax + "\n\n";
  output += "📝 *Input:*\n```javascript\n" + 
    (codeToExecute.length > 600 
      ? codeToExecute.substring(0, 600) + "..." 
      : codeToExecute) + 
    "\n```\n\n";
  output += "📤 *Output:*\n```javascript\n" + 
    (util.format(_return).length > 600 
      ? util.format(_return).substring(0, 600) + "..." 
      : util.format(_return)) + 
    "\n```";

  // Send the result
  await reply(output);
};

handler.help = ['eval <code>'];
handler.tags = ['owner'];
handler.command = /^(>|eval|\=>|\$)$/i;

export default handler;