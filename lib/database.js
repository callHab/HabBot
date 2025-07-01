import fs from "fs"
import path from "path"
import chalk from "chalk"

// Database file paths
const USERS_DB = "./database/users.json"
const COMMANDS_DB = "./database/commands.json"

// Ensure database directory exists
const DB_DIR = "./database"
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// Initialize database files if they don't exist
if (!fs.existsSync(USERS_DB)) {
  fs.writeFileSync(USERS_DB, JSON.stringify({}, null, 2))
}

if (!fs.existsSync(COMMANDS_DB)) {
  fs.writeFileSync(COMMANDS_DB, JSON.stringify({}, null, 2))
}

// Load databases
let usersDB = {}
let commandsDB = {}

try {
  usersDB = JSON.parse(fs.readFileSync(USERS_DB, "utf8"))
} catch (error) {
  console.error(chalk.red("Error loading users database:"), error)
  usersDB = {}
}

try {
  commandsDB = JSON.parse(fs.readFileSync(COMMANDS_DB, "utf8"))
} catch (error) {
  console.error(chalk.red("Error loading commands database:"), error)
  commandsDB = {}
}

// Save databases
const saveUsersDB = () => {
  try {
    fs.writeFileSync(USERS_DB, JSON.stringify(usersDB, null, 2))
  } catch (error) {
    console.error(chalk.red("Error saving users database:"), error)
  }
}

const saveCommandsDB = () => {
  try {
    fs.writeFileSync(COMMANDS_DB, JSON.stringify(commandsDB, null, 2))
  } catch (error) {
    console.error(chalk.red("Error saving commands database:"), error)
  }
}

// Helper function to check premium status without calling other functions
const checkPremiumStatus = (user) => {
  if (!user || !user.premium) return false
  
  // Check if premium has expired
  if (user.premiumExpire > 0 && user.premiumExpire < Date.now()) {
    user.premium = false
    user.premiumExpire = 0
    saveUsersDB()
    return false
  }
  
  return true
}

// Helper function to check if limit should be reset
const shouldResetLimit = (user) => {
  const now = Date.now()
  const resetInterval = global.limitConfig?.resetInterval || "daily"
  
  if (resetInterval === "daily") {
    // Simple daily reset - check if more than 24 hours have passed
    const hoursSinceReset = (now - user.lastLimitReset) / (1000 * 60 * 60)
    return hoursSinceReset >= 24
  } else if (resetInterval === "hourly") {
    const hoursSinceReset = (now - user.lastLimitReset) / (1000 * 60 * 60)
    return hoursSinceReset >= 1
  }
  
  return false
}

// User management functions
const getUser = (userId) => {
  if (!usersDB[userId]) {
    usersDB[userId] = {
      id: userId,
      limit: global.limitConfig?.defaultLimit || 20,
      premium: false,
      premiumExpire: 0,
      totalCommands: 0,
      joinDate: Date.now(),
      lastLimitReset: Date.now()
    }
    saveUsersDB()
  }
  
  const user = usersDB[userId]
  
  // Check if limit needs to be reset (only for non-premium users)
  // Panggil checkPremiumStatus untuk memastikan status premium user sudah terupdate
  if (shouldResetLimit(user) && !checkPremiumStatus(user)) { 
    user.limit = global.limitConfig?.defaultLimit || 20
    user.lastLimitReset = Date.now()
    saveUsersDB()
  }
  
  return user
}

const addLimit = (userId, amount) => {
  const user = getUser(userId)
  user.limit += amount
  saveUsersDB()
  return user.limit
}

const useLimit = (userId, amount = 1) => {
  const user = getUser(userId)
  if (user.limit >= amount) {
    user.limit -= amount
    saveUsersDB()
    return true
  }
  return false
}

const resetLimit = (userId) => {
  const user = getUser(userId)
  user.limit = global.limitConfig?.defaultLimit || 20
  user.lastLimitReset = Date.now()
  saveUsersDB()
  return user.limit
}

const isPremium = (userId) => {
  // Panggil getUser untuk memastikan user ada dan data terupdate
  const user = getUser(userId)
  return checkPremiumStatus(user)
}

const addPremium = (userId, duration = 0) => {
  const user = getUser(userId)
  user.premium = true
  
  if (duration > 0) {
    user.premiumExpire = Date.now() + duration
  } else {
    user.premiumExpire = 0 // Permanent
  }
  
  saveUsersDB()
  return user
}

const removePremium = (userId) => {
  const user = getUser(userId)
  user.premium = false
  user.premiumExpire = 0
  saveUsersDB()
  return user
}

const getPremiumUsers = () => {
  return Object.values(usersDB).filter(user => checkPremiumStatus(user))
}

const getTotalUsers = () => {
  return Object.keys(usersDB).length
}

// Command management functions
const getCommand = (commandName) => {
  if (!commandsDB[commandName]) {
    commandsDB[commandName] = {
      name: commandName,
      premium: false,
      limit: false,
      limitCost: 1,
      totalUsage: 0,
      createdAt: Date.now()
    }
    saveCommandsDB()
  }
  return commandsDB[commandName]
}

const setCommandPremium = (commandName, isPremiumRequired) => {
  const command = getCommand(commandName)
  command.premium = isPremiumRequired
  saveCommandsDB()
  return command
}

const setCommandLimit = (commandName, hasLimit, cost = 1) => {
  const command = getCommand(commandName)
  command.limit = hasLimit
  command.limitCost = cost
  saveCommandsDB()
  return command
}

const getPremiumCommands = () => {
  return Object.values(commandsDB).filter(cmd => cmd.premium)
}

const getLimitCommands = () => {
  return Object.values(commandsDB).filter(cmd => cmd.limit)
}

const incrementCommandUsage = (commandName) => {
  const command = getCommand(commandName)
  command.totalUsage += 1
  saveCommandsDB()
  return command.totalUsage
}

// Export all functions
export default {
  // User functions
  getUser,
  addLimit,
  useLimit,
  resetLimit,
  isPremium,
  addPremium,
  removePremium,
  getPremiumUsers,
  getTotalUsers,
  
  // Command functions
  getCommand,
  setCommandPremium,
  setCommandLimit,
  getPremiumCommands,
  getLimitCommands,
  incrementCommandUsage,
  
  // Database access (for advanced usage)
  usersDB,
  commandsDB,
  saveUsersDB,
  saveCommandsDB
}
