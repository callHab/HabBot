import { makeInMemoryStore } from '@whiskeysockets/baileys';
import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../database', 'baileys.sqlite');

// Ensure database directory exists
const DB_DIR = path.join(__dirname, '../database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false, // Set to console.log to see SQL queries
});

// Define models for Baileys data
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  remoteJid: DataTypes.STRING,
  fromMe: DataTypes.BOOLEAN,
  message: DataTypes.JSON, // Store message content as JSON
  status: DataTypes.INTEGER,
  participant: DataTypes.STRING,
  pushName: DataTypes.STRING,
  messageTimestamp: DataTypes.INTEGER,
  key: DataTypes.JSON, // Store message key as JSON
});

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  conversationTimestamp: DataTypes.INTEGER,
  name: DataTypes.STRING,
  unreadCount: DataTypes.INTEGER,
  isGroup: DataTypes.BOOLEAN,
  lastMessage: DataTypes.JSON, // Store last message as JSON
});

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: DataTypes.STRING,
  imgUrl: DataTypes.STRING,
  verifiedName: DataTypes.STRING,
});

// Sync models with database
async function syncDatabase() {
  try {
    await sequelize.sync();
    console.log(chalk.green(`[STORE] SQLite database synced at ${DB_PATH}`));
  } catch (error) {
    console.error(chalk.red(`[STORE] Error syncing SQLite database:`), error);
  }
}

// Custom store implementation
export const makeSQLiteStore = async (logger) => {
  await syncDatabase(); // Ensure database is synced before creating store

  const store = makeInMemoryStore({ logger });

  // Override store methods to save/load from SQLite
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
    store.messages.upsert(message, type); // Also update in-memory store for immediate access
  };

  store.loadChats = async () => {
    const chats = await Chat.findAll();
    chats.forEach(chat => store.chats.upsert(chat));
    return store.chats;
  };

  store.upsertChat = async (chat, type) => {
    const existing = await Chat.findByPk(chat.id);
    const data = {
      id: chat.id,
      conversationTimestamp: chat.conversationTimestamp,
      name: chat.name,
      unreadCount: chat.unreadCount,
      isGroup: chat.isGroup,
      lastMessage: chat.lastMessage,
    };
    if (existing) {
      await existing.update(data);
    } else {
      await Chat.create(data);
    }
    store.chats.upsert(chat, type);
  };

  store.loadContacts = async () => {
    const contacts = await Contact.findAll();
    contacts.forEach(contact => store.contacts.upsert(contact));
    return store.contacts;
  };

  store.upsertContact = async (contact, type) => {
    const existing = await Contact.findByPk(contact.id);
    const data = {
      id: contact.id,
      name: contact.name,
      imgUrl: contact.imgUrl,
      verifiedName: contact.verifiedName,
    };
    if (existing) {
      await existing.update(data);
    } else {
      await Contact.create(data);
    }
    store.contacts.upsert(contact, type);
  };

  // Bind Baileys events to custom store methods
  store.bind(new (await import('@whiskeysockets/baileys')).BaileysEventEmitter(sequelize.models));

  return store;
};

// Watch for file changes
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`[STORE] Update ${__filename}`));
  // No need to restart the whole bot, just log the update
});
