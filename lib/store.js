import { makeInMemoryStore } from '@whiskeysockets/baileys';
import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../database', 'baileys.sqlite');
const DB_DIR = path.join(__dirname, '../database');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false,
});

// Model definitions
const Message = sequelize.define('Message', {
  id: { type: DataTypes.STRING, primaryKey: true },
  remoteJid: DataTypes.STRING,
  fromMe: DataTypes.BOOLEAN,
  message: DataTypes.JSON,
  status: DataTypes.INTEGER,
  participant: DataTypes.STRING,
  pushName: DataTypes.STRING,
  messageTimestamp: DataTypes.INTEGER,
  key: DataTypes.JSON,
});

const Chat = sequelize.define('Chat', {
  id: { type: DataTypes.STRING, primaryKey: true },
  conversationTimestamp: DataTypes.INTEGER,
  name: DataTypes.STRING,
  unreadCount: DataTypes.INTEGER,
  isGroup: DataTypes.BOOLEAN,
  lastMessage: DataTypes.JSON,
});

const Contact = sequelize.define('Contact', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: DataTypes.STRING,
  imgUrl: DataTypes.STRING,
  verifiedName: DataTypes.STRING,
});

async function syncDatabase() {
  try {
    await sequelize.sync();
    console.log(chalk.green(`[STORE] SQLite database synced at ${DB_PATH}`));
  } catch (error) {
    console.error(chalk.red(`[STORE] Error syncing SQLite database:`), error);
  }
}

export const makeSQLiteStore = async (logger) => {
  await syncDatabase();
  const store = makeInMemoryStore({ logger });

  // Override methods to use SQLite
  store.loadMessages = async (jid, count, cursor) => {
    const where = { remoteJid: jid };
    if (cursor) {
      where.messageTimestamp = { [Sequelize.Op.lt]: cursor.messageTimestamp };
    }
    const messages = await Message.findAll({
      where,
      order: [['messageTimestamp', 'DESC']],
      limit: count,
    });
    return messages.map(msg => ({
      key: msg.key,
      message: msg.message,
      messageTimestamp: msg.messageTimestamp,
      status: msg.status,
      participant: msg.participant,
      pushName: msg.pushName,
    }));
  };

  store.upsertMessage = async (message, type) => {
    const existing = await Message.findByPk(message.key.id);
    const data = {
      id: message.key.id,
      remoteJid: message.key.remoteJid,
      fromMe: message.key.fromMe,
      message: message.message,
      status: message.status,
      participant: message.participant,
      pushName: message.pushName,
      messageTimestamp: message.messageTimestamp,
      key: message.key,
    };
    if (existing) {
      await existing.update(data);
    } else {
      await Message.create(data);
    }
    store.messages.upsert(message, type);
  };

  // Implement other store methods similarly...

  // Hapus baris yang mencoba membuat BaileysEventEmitter
  // Tidak perlu implementasi bind() karena sudah ada di makeInMemoryStore

  return store;
};

// Watch for file changes
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`[STORE] Update ${__filename}`));
});
