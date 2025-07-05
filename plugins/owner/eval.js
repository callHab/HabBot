import syntaxError from "syntax-error";
import util from "util";
import { fileURLToPath } from "url";
import fs from "fs";
import { exec as shellExec } from "child_process";

const __filename = fileURLToPath(import.meta.url);

class CustomArray extends Array {
  constructor(...args) {
    if (typeof args[0] === "number") return super(Math.min(args[0], 10000));
    else return super(...args);
  }
}

const handler = async (m, { conn, args, text = "", body = "", command, isCreator, reply }) => {
  if (!isCreator) return;

  let _return;
  let _syntax = "";
  let codeToExecute = "";
  let isShellCommand = false;

  // Normalize input - prioritize body over text/args
  const inputText = (typeof body === 'string' && body.trim()) 
    ? body.trim() 
    : (text || args.join(' ')).trim();

  // Command detection
  if (!inputText) {
    return reply("📝 *EVAL MENU* [[v2.0]]\n\n▸ `> code`    : Execute JavaScript\n▸ `=> expr`   : Return expression\n▸ `$ command` : Execute shell command\n▸ `.eval code`: Alias for evaluation\n\nExamples:\n> 2+2\n=> [1,2,3].map(x=>x*2)\n$ ls -la");
  }

  // Check for command prefixes
  if (inputText.startsWith("=>")) {
    codeToExecute = `return ${inputText.slice(2).trim()}`;
  } else if (inputText.startsWith(">")) {
    codeToExecute = inputText.slice(1).trim();
  } else if (inputText.startsWith("$")) {
    isShellCommand = true;
    codeToExecute = inputText.slice(1).trim();
  } else if (command === "eval") {
    codeToExecute = inputText;
  }

  if (!codeToExecute.trim()) {
    return reply("❌ No code/command provided!");
  }

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
    // Syntax check
    const syntaxCheck = syntaxError(
      codeToExecute.startsWith("return") 
        ? codeToExecute 
        : `return (async () => { ${codeToExecute} })()`,
      __filename
    );
    
    if (syntaxCheck) {
      _syntax = `❌ Syntax Error:\n${syntaxCheck.toString().replace(__filename, "eval")}`;
    } else {
      // Execute code
      const fn = new Function(...Object.keys(ctx), 
        codeToExecute.startsWith("return") 
          ? codeToExecute 
          : `return (async () => { ${codeToExecute} })()`
      );
      
      _return = await fn(...Object.values(ctx));
      if (_return === undefined) _return = "✅ Code executed (no return value)";
    }
  } catch (e) {
    _return = `❌ Execution Error:\n${e.stack}`;
  }

  // Format output
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
handler.command = /^(>|eval|\=>|\$)$/i;
handler.owner = true;

export default handler;