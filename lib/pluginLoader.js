import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import db from './database.js';
import { getWIBTime as getTime } from './utils/time.js'; // Import fungsi waktu dari utilitas

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin root directory
const PLUGINS_DIR = path.join(__dirname, '../plugins');

// Create plugins directory if it doesn't exist
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  console.log(chalk.green(`Created plugins directory: ${PLUGINS_DIR}`));
}

let globalPlugins = {}; // Struktur: { category: { mainCommandName: { handler, metadata, file } } }
let globalCommands = {}; // Struktur: { commandName (termasuk alias): { handler, metadata, file, category, isAlias } }

export const loadPlugins = async () => {
  globalPlugins = {};
  globalCommands = {};

  try {
    const items = fs.readdirSync(PLUGINS_DIR);
    
    if (items.length === 0) {
      console.log(chalk.yellow(`[${getTime()}] No plugins found in ${PLUGINS_DIR}`));
      return globalPlugins;
    }

    // First pass: Load all plugins and categorize them
    for (const item of items) {
      const itemPath = path.join(PLUGINS_DIR, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        await loadPluginsFromCategory(itemPath, item);
      } else if (stats.isFile() && item.endsWith('.js')) {
        await loadSinglePlugin(itemPath, 'uncategorized');
      }
    }

    updateGlobalCommands(); // Populate globalCommands after all plugins are loaded

    const totalPlugins = Object.values(globalPlugins).reduce((acc, cat) => acc + Object.keys(cat).length, 0);
    console.log(chalk.cyan(`[${getTime()}] Successfully loaded ${totalPlugins} unique plugins.`));

    startPluginWatcher(); // Start watcher after initial load

    return globalPlugins;
  } catch (error) {
    console.error(chalk.red(`[${getTime()}] Error loading plugins:`), error);
    return globalPlugins;
  }
};

async function loadPluginsFromCategory(categoryPath, categoryName) {
  if (!globalPlugins[categoryName]) {
    globalPlugins[categoryName] = {};
  }

  console.log(chalk.yellow(`[${getTime()}] Loading plugins from category: ${categoryName}`));
  try {
    const files = fs.readdirSync(categoryPath);
    for (const file of files) {
      if (file.endsWith('.js')) {
        await loadSinglePlugin(path.join(categoryPath, file), categoryName);
      }
    }
  } catch (error) {
    console.error(chalk.red(`[${getTime()}] Error loading category ${categoryName}:`), error);
  }
}

async function loadSinglePlugin(filePath, category) {
  try {
    const fileUrl = `file://${filePath}`;
    // Menggunakan Date.now() untuk memastikan modul di-reload jika ada perubahan
    const plugin = await import(`${fileUrl}?update=${Date.now()}`); 
    const handler = plugin.default || plugin;

    // Nama command utama adalah nama file (tanpa .js)
    const mainCommandName = path.basename(filePath, '.js').toLowerCase();
    // Ambil semua command yang didefinisikan di plugin, termasuk alias
    const allCommandNames = Array.isArray(handler.command) ? handler.command.map(cmd => cmd.toLowerCase()) : [mainCommandName];

    const metadata = {
      command: allCommandNames, // Simpan semua nama command (utama + alias)
      tags: handler.tags || [],
      owner: !!handler.owner,
      premium: !!handler.premium,
      limit: !!handler.limit,
      limitCost: handler.limitCost || 1, // Default cost 1 jika tidak ditentukan
      group: !!handler.group,
      admin: !!handler.admin,
      botAdmin: !!handler.botAdmin,
      category
    };

    // Simpan hanya command utama di globalPlugins
    if (!globalPlugins[category]) {
      globalPlugins[category] = {};
    }
    globalPlugins[category][mainCommandName] = {
      handler,
      metadata: { ...metadata, isAlias: false }, // Command utama bukan alias
      file: filePath
    };

    console.log(chalk.green(`[${getTime()}] Loaded: ${category}/${mainCommandName}`));

    return true;
  } catch (error) {
    console.error(chalk.red(`[${getTime()}] Failed to load plugin ${filePath}:`), error);
    return false;
  }
}

const updateGlobalCommands = () => {
  globalCommands = {};
  for (const [category, plugins] of Object.entries(globalPlugins)) {
    for (const [mainCommandName, data] of Object.entries(plugins)) {
      // Tambahkan command utama
      globalCommands[mainCommandName] = {
        ...data,
        category,
        isAlias: false // Pastikan command utama ditandai bukan alias
      };

      // Tambahkan alias
      data.metadata.command.forEach(cmdName => {
        if (cmdName !== mainCommandName) { // Jangan duplikasi command utama sebagai alias
          globalCommands[cmdName] = {
            ...data, // Referensi ke handler dan metadata yang sama
            category,
            isAlias: true // Tandai sebagai alias
          };
        }
      });
    }
  }
  return globalCommands;
};

export const getCommands = () => globalCommands;

// Fungsi untuk memeriksa apakah user dapat menjalankan command
export const canExecuteCommand = (userId, commandName) => {
  try {
    const command = globalCommands[commandName];
    if (!command) {
      return { canExecute: false, message: "❌ Command tidak ditemukan!" };
    }

    // Ambil data command dari database untuk memastikan status premium/limit terupdate
    // Gunakan nama command utama yang terkait dengan alias ini
    const mainCommandDbName = command.metadata.command[0]; 
    const dbCommand = db.getCommand(mainCommandDbName); 
    const user = db.getUser(userId); // Ambil data user dari database

    // Check if command requires premium
    if (dbCommand.premium && !db.isPremium(userId)) {
      return { canExecute: false, message: "❌ Command ini hanya untuk pengguna premium!" };
    }

    // Check if command has limit requirement (only for non-premium users)
    if (dbCommand.limit && !db.isPremium(userId)) {
      const limitCost = dbCommand.limitCost || 1; // Gunakan limitCost dari database
      
      if (user.limit < limitCost) {
        return { 
          canExecute: false, 
          message: `❌ Limit tidak cukup! Dibutuhkan ${limitCost}, tersisa ${user.limit}` 
        };
      }
    }

    return { canExecute: true, message: "OK" };
  } catch (error) {
    console.error('Error in canExecuteCommand:', error);
    return { canExecute: false, message: "❌ Error checking command permissions!" };
  }
};

export const executeCommand = (userId, commandName) => {
  try {
    const command = globalCommands[commandName];
    if (!command) return false;

    // Ambil data command dari database untuk memastikan status premium/limit terupdate
    const mainCommandDbName = command.metadata.command[0];
    const dbCommand = db.getCommand(mainCommandDbName); 

    // Deduct limit if command requires it and user is not premium
    if (dbCommand.limit && !db.isPremium(userId)) {
      const limitCost = dbCommand.limitCost || 1;
      db.useLimit(userId, limitCost);
    }

    // Update command usage stats
    db.incrementCommandUsage(dbCommand.name); // Gunakan nama command utama dari dbCommand

    // Update user stats
    const user = db.getUser(userId);
    user.totalCommands += 1;
    db.saveUsersDB();

    return true;
  } catch (error) {
    console.error('Error in executeCommand:', error);
    return false;
  }
};

let watcher = null;
const startPluginWatcher = () => {
  if (watcher) return;

  const setupRecursiveWatcher = (dir) => {
    fs.watch(dir, { persistent: true }, async (eventType, filename) => {
      if (!filename) return;
      const filePath = path.join(dir, filename);
      try {
        if (!fs.existsSync(filePath)) {
          if (filename.endsWith('.js')) {
            removePlugin(filePath);
          }
          return;
        }
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          // If a new directory is created, set up a watcher for it
          setupRecursiveWatcher(filePath); 
        } else if (filename.endsWith('.js')) {
          await reloadPlugin(filePath);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error watching ${filePath}:`, error);
        }
      }
    });

    try {
      fs.readdirSync(dir).forEach(item => {
        const itemPath = path.join(dir, item); 
        if (fs.statSync(itemPath).isDirectory()) {
          setupRecursiveWatcher(itemPath);
        }
      });
    } catch (error) {
      console.error(`Error setting up watcher for ${dir}:`, error);
    }
  };

  setupRecursiveWatcher(PLUGINS_DIR);
  watcher = true; // Mark watcher as started
};

export const reloadPlugin = async (filePath) => {
  const relativePath = path.relative(PLUGINS_DIR, filePath);
  const category = relativePath.includes(path.sep) 
    ? relativePath.split(path.sep)[0]
    : 'uncategorized';
  
  await loadSinglePlugin(filePath, category);
  updateGlobalCommands();
};

export const removePlugin = (filePath) => {
  const relativePath = path.relative(PLUGINS_DIR, filePath);
  const category = relativePath.includes(path.sep) 
    ? relativePath.split(path.sep)[0]
    : 'uncategorized';
  const mainCommandName = path.basename(filePath, '.js').toLowerCase();

  if (globalPlugins[category] && globalPlugins[category][mainCommandName]) {
    delete globalPlugins[category][mainCommandName];
    
    // Hapus kategori jika kosong setelah plugin dihapus
    if (Object.keys(globalPlugins[category]).length === 0) {
      delete globalPlugins[category];
    }
    
    updateGlobalCommands();
    console.log(chalk.red(`[${getTime()}] Removed: ${category}/${mainCommandName}`));
    return true;
  }
  return false;
};

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`[${getTime()}] Reloading ${path.basename(__filename)}`));
  import(`file://${__filename}?update=${Date.now()}`).catch(console.error);
});
