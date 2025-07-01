/**
 * HABOT-MD - WhatsApp Bot
 * Universal Header Edition
 * @h4bdev
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('figlet-fonts-bloody'); // Load custom font

import baileys from "@whiskeysockets/baileys";
import pino from "pino";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import Box from "cli-box";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== [ UNIVERSAL HEADER GENERATOR ] ==================== //
const generateHeader = (text, width = 60) => {
  // Create gradient for header
  const headerGradient = gradient(['#ff0000', '#9900cc', '#ff0066']);
  
  // Generate ASCII art text
  const asciiText = figlet.textSync(text, {
    font: 'Bloody',
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
    `${border.replace('╔', '╚').replace('╗', '╝')}`
  );
};

// ==================== [ MAIN BOT DISPLAY ] ==================== //
const displayBotInterface = () => {
  console.clear();
  
  // 1. Header utama dengan nama bot
  console.log(generateHeader(global.botName || 'HABOT-MD'));
  
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
      ` ${chalk.bold('✧ STATUS:')} ${chalk.green('CONNECTED')}`,
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

// ==================== [ BOT INITIALIZATION ] ==================== //
async function startBot() {
  try {
    // Display interface
    displayBotInterface();
    
    // Load config
    const { default: config } = await import('./lib/settings/config.js');
    Object.assign(global, config);
    
    // Rest of your bot initialization code...
    // [Your existing bot initialization logic here]
    
  } catch (error) {
    const errorGradient = gradient(['#ff0000', '#990000']);
    console.log(errorGradient(figlet.textSync('BOOT ERROR')));
    console.error(errorGradient(error.stack));
    process.exit(1);
  }
}

// Start the bot
startBot();