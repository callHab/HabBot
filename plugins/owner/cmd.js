const handler = async (m, { conn, args, text, command, reply, isCreator, db }) => {
  // if (!isCreator) return reply("❌ Command ini khusus untuk owner!") // Dihapus, validasi di habbot.js

  if (!args[0]) {
    return reply(`
🛠️ *COMMAND MANAGEMENT*

📌 *Premium Management:*
• \`.cmd prem <command> true/false\` - Set command premium
• \`.cmd prem list\` - List premium commands

📊 *Limit Management:*
• \`.cmd limit <command> true/false\` - Set command limit
• \`.cmd limit list\` - List limit commands

⚙️ *Limit Cost:*
• \`.limit cmd <command> <cost>\` - Set limit cost per command

*Example:*
\`.cmd prem ping true\` - Make ping command premium only
\`.cmd limit menu false\` - Remove limit from menu command
\`.limit cmd sticker 2\` - Set sticker command cost 2 limits
`)
  }

  const subCommand = args[0].toLowerCase()
  
  if (subCommand === "prem") {
    if (!args[1]) return reply("❌ Masukkan nama command!")
    
    if (args[1] === "list") {
      const premiumCommands = db.getPremiumCommands()
      if (premiumCommands.length === 0) {
        return reply("📋 Tidak ada command premium yang terdaftar.")
      }
      
      let list = "🔰 *PREMIUM COMMANDS LIST*\n\n"
      premiumCommands.forEach((cmd, index) => {
        list += `${index + 1}. ${cmd.name}\n`
      })
      
      return reply(list)
    }
    
    const cmdName = args[1].toLowerCase()
    const isPremium = args[2] === "true"
    
    db.setCommandPremium(cmdName, isPremium)
    
    reply(`✅ Command *${cmdName}* ${isPremium ? "sekarang premium only" : "bukan premium lagi"}`)
    
  } else if (subCommand === "limit") {
    if (!args[1]) return reply("❌ Masukkan nama command!")
    
    if (args[1] === "list") {
      const limitCommands = db.getLimitCommands()
      if (limitCommands.length === 0) {
        return reply("📋 Tidak ada command dengan limit yang terdaftar.")
      }
      
      let list = "⏳ *LIMIT COMMANDS LIST*\n\n"
      limitCommands.forEach((cmd, index) => {
        list += `${index + 1}. ${cmd.name} (Cost: ${cmd.limitCost})\n`
      })
      
      return reply(list)
    }
    
    const cmdName = args[1].toLowerCase()
    const hasLimit = args[2] === "true"
    
    db.setCommandLimit(cmdName, hasLimit)
    
    reply(`✅ Command *${cmdName}* ${hasLimit ? "sekarang menggunakan limit" : "tidak menggunakan limit lagi"}`)
    
  } else {
    reply("❌ Sub-command tidak valid! Gunakan: prem atau limit")
  }
}

handler.help = ["cmd"]
handler.tags = ["owner"]
handler.command = ["cmd"]
handler.owner = true // Penting: ini menandakan command ini hanya untuk owner

export default handler
