// File: /HabBot/lib/pluginLoader.js
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

let globalPlugins = {};
let globalCommands = {};

export const loadPlugins = async () => {
  globalPlugins = {};
  globalCommands = {};

  try {
    const items = fs.readdirSync(PLUGINS_DIR);
    
    if (items.length === 0) {
      console.log(chalk.yellow(`[${getTime()}] No plugins found in ${PLUGINS_DIR}`));
      return globalPlugins;
    }

    for (const item of items) {
      const itemPath = path.join(PLUGINS_DIR, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        await loadPluginsFromCategory(itemPath, item);
      } else if (stats.isFile() && item.endsWith('.js')) {
        await loadSinglePlugin(itemPath, 'uncategorized');
      }
    }

    updateGlobalCommands();
    startPluginWatcher();

    const totalPlugins = Object.values(globalPlugins).reduce((acc, cat) => acc + Object.keys(cat).length, 0);
    console.log(chalk.cyan(`[${getTime()}] Loaded ${totalPlugins} plugins`));

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
    const plugin = await import(`${fileUrl}?update=${Date.now()}`);
    const handler = plugin.default || plugin;

    const metadata = {
      command: Array.isArray(handler.command) ? handler.command : [path.basename(filePath, '.js')],
      tags: handler.tags || [],
      owner: !!handler.owner,
      premium: !!handler.premium,
      limit: !!handler.limit,
      category
    };

    const commandName = metadata.command[0];

    if (!globalPlugins[category]) {
      globalPlugins[category] = {};
    }

    globalPlugins[category][commandName] = {
      handler,
      metadata,
      file: filePath
    };

    // Register aliases
    if (metadata.command.length > 1) {
      metadata.command.slice(1).forEach(alias => {
        globalPlugins[category][alias] = {
          handler,
          metadata: { ...metadata, isAlias: true },
          file: filePath
        };
      });
    }

    console.log(chalk.green(
      `[${getTime()}] Loaded: ${category}/${commandName}`
    ));

    return true;
  } catch (error) {
    console.error(chalk.red(`[${getTime()}] Failed to load plugin ${filePath}:`), error);
    return false;
  }
}

const updateGlobalCommands = () => {
  globalCommands = {};
  for (const [category, plugins] of Object.entries(globalPlugins)) {
    for (const [name, data] of Object.entries(plugins)) {
      globalCommands[name] = {
        ...data,
        category,
        isAlias: data.metadata.isAlias || false
      };
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

    // Check if command requires premium
    if (command.metadata.premium && !db.isPremium(userId)) {
      return { canExecute: false, message: "❌ Command ini hanya untuk pengguna premium!" };
    }

    // Check if command has limit requirement
    if (command.metadata.limit && !db.isPremium(userId)) {
      const user = db.getUser(userId);
      const limitCost = command.metadata.limitCost || 1;
      
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

    // Deduct limit if command requires it and user is not premium
    if (command.metadata.limit && !db.isPremium(userId)) {
      const limitCost = command.metadata.limitCost || 1;
      db.useLimit(userId, limitCost);
    }

    // Update command usage stats
    db.incrementCommandUsage(commandName);

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
  let found = false;
  for (const [category, plugins] of Object.entries(globalPlugins)) {
    for (const [name, data] of Object.entries(plugins)) {  // Perbaikan: ganti '=' dengan 'of'
      if (data.file === filePath) {
        delete plugins[name];
        found = true;
        break;
      }
    }
    if (found) break;
  }
  updateGlobalCommands();
  return found;
};


fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`[${getTime()}] Reloading ${path.basename(__filename)}`));
  import(`file://${__filename}?update=${Date.now()}`).catch(console.error);
});
