import { runtime } from "../../lib/myfunction.js"
import os from "os"

const handler = async (m, { conn, reply, db }) => {
  const startTime = process.uptime()
  const totalUsers = db.getTotalUsers()
  const premiumUsers = db.getPremiumUsers().length
  const premiumCommands = db.getPremiumCommands().length
  const limitCommands = db.getLimitCommands().length
  
  const status = `
🤖 *BOT STATUS*

⏰ *Runtime:* ${runtime(startTime)}
👥 *Total Users:* ${totalUsers}
🔰 *Premium Users:* ${premiumUsers}

📊 *Commands:*
• Premium Commands: ${premiumCommands}
• Limit Commands: ${limitCommands}

💻 *System Info:*
• Platform: ${os.platform()}
• Node.js: ${process.version}
• Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• CPU: ${os.cpus()[0].model}

🔧 *Bot Info:*
• Name: ${global.botName}
• Version: ${global.botVersion}
• Owner: ${global.ownerName}

✅ *Status: Online & Ready*
`

  reply(status)
}

handler.help = ["status", "stats"]
handler.tags = ["info"]
handler.command = ["status", "stats", "botinfo"]

export default handler
