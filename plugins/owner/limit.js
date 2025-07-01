const handler = async (m, { conn, args, text, command, reply, isCreator, db, quoted }) => {
  // if (!isCreator) return reply("❌ Command ini khusus untuk owner!") // Dihapus, validasi di habbot.js

  if (!args[0]) {
    return reply(`
⏳ *LIMIT MANAGEMENT*

👥 *User Management:*
• \`.limit add <reply/tag/nomor> <jumlah>\` - Tambah limit user
• \`.limit reset <reply/tag/nomor>\` - Reset limit user
• \`.limit check <reply/tag/nomor>\` - Cek limit user

⚙️ *Command Settings:*
• \`.limit cmd <command> <cost>\` - Set limit cost per command

🔄 *Reset Settings:*
• \`.limit set daily <jumlah>\` - Set daily limit reset
• \`.limit set hourly <jumlah>\` - Set hourly limit reset

*Example:*
\`.limit add @user 50\` - Tambah 50 limit ke user
\`.limit cmd sticker 2\` - Set sticker command cost 2 limits
`)
  }

  const subCommand = args[0].toLowerCase()
  
  if (subCommand === "add") {
    let target
    let amount = parseInt(args[args.length - 1])
    
    if (isNaN(amount)) return reply("❌ Jumlah limit harus berupa angka!")
    
    // Get target user
    if (quoted) {
      target = quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
      target = m.mentionedJid[0]
    } else if (args[1] && args[1].includes("@")) {
      target = args[1].replace("@", "") + "@s.whatsapp.net"
    } else {
      return reply("❌ Tag/reply user yang ingin ditambah limitnya!")
    }
    
    db.addLimit(target, amount)
    const user = db.getUser(target)
    
    reply(`✅ Berhasil menambah ${amount} limit untuk user!\nTotal limit sekarang: ${user.limit}`)
    
  } else if (subCommand === "reset") {
    let target
    
    // Get target user
    if (quoted) {
      target = quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
      target = m.mentionedJid[0]
    } else if (args[1] && args[1].includes("@")) {
      target = args[1].replace("@", "") + "@s.whatsapp.net"
    } else {
      return reply("❌ Tag/reply user yang ingin direset limitnya!")
    }
    
    db.resetLimit(target)
    const user = db.getUser(target)
    
    reply(`✅ Berhasil reset limit user!\nLimit sekarang: ${user.limit}`)
    
  } else if (subCommand === "check") {
    let target
    
    // Get target user
    if (quoted) {
      target = quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
      target = m.mentionedJid[0]
    } else if (args[1] && args[1].includes("@")) {
      target = args[1].replace("@", "") + "@s.whatsapp.net"
    } else {
      return reply("❌ Tag/reply user yang ingin dicek limitnya!")
    }
    
    const user = db.getUser(target)
    const isPremium = db.isPremium(target)
    
    reply(`
👤 *USER LIMIT INFO*

📱 User: ${target.split("@")[0]}
⏳ Limit: ${isPremium ? "Unlimited (Premium)" : user.limit}
🔰 Premium: ${isPremium ? "Yes" : "No"}
📊 Total Commands: ${user.totalCommands}
`)
    
  } else if (subCommand === "cmd") {
    if (!args[1] || !args[2]) return reply("❌ Format: .limit cmd <command> <cost>")
    
    const cmdName = args[1].toLowerCase()
    const cost = parseInt(args[2])
    
    if (isNaN(cost)) return reply("❌ Cost harus berupa angka!")
    
    db.setCommandLimit(cmdName, true, cost)
    
    reply(`✅ Command *${cmdName}* sekarang membutuhkan ${cost} limit`)
    
  } else if (subCommand === "set") {
    if (!args[1] || !args[2]) return reply("❌ Format: .limit set <daily/hourly> <jumlah>")
    
    const interval = args[1].toLowerCase()
    const amount = parseInt(args[2])
    
    if (isNaN(amount)) return reply("❌ Jumlah harus berupa angka!")
    
    if (interval === "daily") {
      global.limitConfig.resetInterval = "daily"
      global.limitConfig.defaultLimit = amount
      reply(`✅ Daily limit reset diset ke ${amount} limit per hari`)
    } else if (interval === "hourly") {
      global.limitConfig.resetInterval = "hourly"
      global.limitConfig.defaultLimit = amount
      reply(`✅ Hourly limit reset diset ke ${amount} limit per jam`)
    } else {
      reply("❌ Interval harus daily atau hourly!")
    }
    
  } else {
    reply("❌ Sub-command tidak valid!")
  }
}

handler.help = ["limit"]
handler.tags = ["owner"]
handler.command = ["limit"]
handler.owner = true // Penting: ini menandakan command ini hanya untuk owner

export default handler
