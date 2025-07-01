const handler = async (m, { conn, args, text, command, reply, isCreator, db, quoted }) => {

  if (!args[0]) {
    return reply(`
🔰 *PREMIUM MANAGEMENT*

👥 *User Management:*
• \`.prem add <reply/tag/nomor> [days]\` - Tambah user premium
• \`.prem del <reply/tag/nomor>\` - Hapus user premium
• \`.prem check <reply/tag/nomor>\` - Cek status premium user
• \`.prem list\` - List semua user premium

⏰ *Duration:*
• Tanpa durasi = Premium permanent
• Dengan durasi = Premium temporary (dalam hari)

*Example:*
\`.prem add @user\` - Premium permanent
\`.prem add @user 30\` - Premium 30 hari
`)
  }

  const subCommand = args[0].toLowerCase()
  
  if (subCommand === "add") {
    let target
    let duration = 0 // 0 = permanent
    
    // Check if duration is specified
    const lastArg = args[args.length - 1]
    if (!isNaN(parseInt(lastArg))) {
      duration = parseInt(lastArg) * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    }
    
    // Get target user
    if (quoted) {
      target = quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
      target = m.mentionedJid[0]
    } else if (args[1] && args[1].includes("@")) {
      target = args[1].replace("@", "") + "@s.whatsapp.net"
    } else {
      return reply("❌ Tag/reply user yang ingin dijadikan premium!")
    }
    
    db.addPremium(target, duration)
    
    const durationText = duration === 0 ? "permanent" : `${duration / (24 * 60 * 60 * 1000)} hari`
    reply(`✅ Berhasil menambahkan user ke premium!\nDurasi: ${durationText}`)
    
  } else if (subCommand === "del") {
    let target
    
    // Get target user
    if (quoted) {
      target = quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
      target = m.mentionedJid[0]
    } else if (args[1] && args[1].includes("@")) {
      target = args[1].replace("@", "") + "@s.whatsapp.net"
    } else {
      return reply("❌ Tag/reply user yang ingin dihapus dari premium!")
    }
    
    db.removePremium(target)
    
    reply(`✅ Berhasil menghapus user dari premium!`)
    
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
      return reply("❌ Tag/reply user yang ingin dicek status premiumnya!")
    }
    
    const user = db.getUser(target)
    const isPremium = db.isPremium(target)
    
    let premiumInfo = "No"
    if (isPremium) {
      if (user.premiumExpire === 0) {
        premiumInfo = "Yes (Permanent)"
      } else {
        const remaining = Math.ceil((user.premiumExpire - Date.now()) / (24 * 60 * 60 * 1000))
        premiumInfo = `Yes (${remaining} days remaining)`
      }
    }
    
    reply(`
👤 *USER PREMIUM INFO*

📱 User: ${target.split("@")[0]}
🔰 Premium: ${premiumInfo}
⏳ Limit: ${isPremium ? "Unlimited" : user.limit}
📊 Total Commands: ${user.totalCommands}
`)
    
  } else if (subCommand === "list") {
    const premiumUsers = db.getPremiumUsers()
    
    if (premiumUsers.length === 0) {
      return reply("📋 Tidak ada user premium yang terdaftar.")
    }
    
    let list = "🔰 *PREMIUM USERS LIST*\n\n"
    premiumUsers.forEach((user, index) => {
      const expireText = user.premiumExpire === 0 ? "Permanent" : 
        `${Math.ceil((user.premiumExpire - Date.now()) / (24 * 60 * 60 * 1000))} days`
      list += `${index + 1}. ${user.id.split("@")[0]} (${expireText})\n`
    })
    
    reply(list)
    
  } else {
    reply("❌ Sub-command tidak valid!")
  }
}

handler.help = ["prem"]
handler.tags = ["owner"]
handler.command = ["prem", "premium"]
handler.owner = true // Penting: ini menandakan command ini hanya untuk owner

export default handler
