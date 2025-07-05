import fs from "fs"
import path from "path"
import chalk from "chalk"

const USERS_DB = "./database/users.json"
const COMMANDS_DB = "./database/commands.json"

const DB_DIR = "./database"
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

if (!fs.existsSync(USERS_DB)) {
  fs.writeFileSync(USERS_DB, JSON.stringify({}, null, 2))
}

if (!fs.existsSync(COMMANDS_DB)) {
  fs.writeFileSync(COMMANDS_DB, JSON.stringify({}, null, 2))
}

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

const checkPremiumStatus = (user) => {
  if (!user?.premium) return false
  
  if (user.premiumExpire > 0 && user.premiumExpire < Date.now()) {
    user.premium = false
    user.premiumExpire = 0
    saveUsersDB()
    return false
  }
  
  return true
}

const shouldResetLimit = (user) => {
  const now = Date.now()
  const resetInterval = global.limitConfig?.resetInterval || "daily"
  
  if (resetInterval === "daily") {
    const hoursSinceReset = (now - user.lastLimitReset) / (1000 * 60 * 60)
    return hoursSinceReset >= 24
  } else if (resetInterval === "hourly") {
    const hoursSinceReset = (now - user.lastLimitReset) / (1000 * 60 * 60)
    return hoursSinceReset >= 1
  }
  
  return false
}

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

const isPremium = (userId) => checkPremiumStatus(getUser(userId))

const addPremium = (userId, duration = 0) => {
  const user = getUser(userId)
  user.premium = true
  user.premiumExpire = duration > 0 ? Date.now() + duration : 0
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

const getPremiumUsers = () => Object.values(usersDB).filter(user => checkPremiumStatus(user))

const getTotalUsers = () => Object.keys(usersDB).length

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

const getPremiumCommands = () => Object.values(commandsDB).filter(cmd => cmd.premium)

const getLimitCommands = () => Object.values(commandsDB).filter(cmd => cmd.limit)

const incrementCommandUsage = (commandName) => {
  const command = getCommand(commandName)
  command.totalUsage += 1
  saveCommandsDB()
  return command.totalUsage
}

export default {
  getUser,
  addLimit,
  useLimit,
  resetLimit,
  isPremium,
  addPremium,
  removePremium,
  getPremiumUsers,
  getTotalUsers,
  
  getCommand,
  setCommandPremium,
  setCommandLimit,
  getPremiumCommands,
  getLimitCommands,
  incrementCommandUsage,
  
  usersDB,
  commandsDB,
  saveUsersDB,
  saveCommandsDB
}
