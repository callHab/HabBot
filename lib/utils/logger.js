// lib/utils/logger.js
import pino from 'pino';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { getWIBTime } from './time.js'; // Menggunakan fungsi waktu yang sudah ada

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi Pino
const logger = pino({
  level: 'info', // Level default
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
      messageFormat: (log, messageKey) => {
        const msg = log[messageKey];
        const level = log.level;
        const module = log.module || 'UNKNOWN';
        const timestamp = getWIBTime(); // Menggunakan fungsi waktu dari bot Anda

        let formattedMsg = `[${timestamp}] [${module}] `;

        switch (level) {
          case 60: // fatal
            formattedMsg += chalk.bgRed.white(`[FATAL] ${msg}`);
            break;
          case 50: // error
            formattedMsg += chalk.red(`[ERROR] ${msg}`);
            break;
          case 40: // warn
            formattedMsg += chalk.yellow(`[WARN] ${msg}`);
            break;
          case 30: // info
            formattedMsg += chalk.cyan(`[INFO] ${msg}`);
            break;
          case 20: // debug
            formattedMsg += chalk.magenta(`[DEBUG] ${msg}`);
            break;
          case 10: // trace
            formattedMsg += chalk.gray(`[TRACE] ${msg}`);
            break;
          default:
            formattedMsg += msg;
        }
        return formattedMsg;
      },
    },
  },
});

// Wrapper untuk menambahkan nama modul secara otomatis
const createModuleLogger = (moduleName) => {
  return {
    info: (message, ...args) => logger.info({ module: moduleName }, message, ...args),
    warn: (message, ...args) => logger.warn({ module: moduleName }, message, ...args),
    error: (message, ...args) => logger.error({ module: moduleName }, message, ...args),
    debug: (message, ...args) => logger.debug({ module: moduleName }, message, ...args),
    fatal: (message, ...args) => logger.fatal({ module: moduleName }, message, ...args),
    
    // Custom loggers
    cmd: (message, ...args) => logger.info({ module: moduleName, type: 'CMD' }, chalk.blue(`[CMD] ${message}`), ...args),
    plugin: (message, ...args) => logger.info({ module: moduleName, type: 'PLUGIN' }, chalk.green(`[PLUGIN] ${message}`), ...args),
    db: (message, ...args) => logger.info({ module: moduleName, type: 'DB' }, chalk.magenta(`[DB] ${message}`), ...args),
    store: (message, ...args) => logger.info({ module: moduleName, type: 'STORE' }, chalk.yellow(`[STORE] ${message}`), ...args),
    config: (message, ...args) => logger.info({ module: moduleName, type: 'CONFIG' }, chalk.gray(`[CONFIG] ${message}`), ...args),
    jadibot: (message, ...args) => logger.info({ module: moduleName, type: 'JADIBOT' }, chalk.hex('#FFA500')(`[JADIBOT] ${message}`), ...args), // Orange
  };
};

// Fungsi untuk mendapatkan nama modul dari stack trace
const getCallingModule = () => {
  const error = new Error();
  const stack = error.stack.split('\n');
  // Cari baris yang bukan dari logger.js itu sendiri
  const callerLine = stack.find(line => !line.includes('logger.js') && line.includes('file://'));
  if (callerLine) {
    const match = callerLine.match(/file:\/\/\/(.*?)(?::\d+)?(?::\d+)?\)$/);
    if (match && match[1]) {
      const filePath = decodeURIComponent(match[1]);
      const relativePath = path.relative(process.cwd(), filePath);
      return relativePath.replace(/\\/g, '/'); // Normalisasi path untuk konsistensi
    }
  }
  return 'UNKNOWN_MODULE';
};

// Export instance logger yang akan digunakan di seluruh aplikasi
const mainLogger = createModuleLogger('MAIN'); // Logger utama untuk index.js, dll.

// Fungsi untuk mendapatkan logger spesifik modul
export const getLogger = (moduleName) => {
  if (moduleName) {
    return createModuleLogger(moduleName);
  }
  // Jika tidak ada nama modul yang diberikan, coba deteksi dari stack trace
  return createModuleLogger(getCallingModule());
};

// Set global logger untuk akses mudah di mana saja
global.logger = getLogger('GLOBAL'); // Anda bisa mengganti 'GLOBAL' dengan nama yang lebih spesifik jika mau

export default getLogger;

