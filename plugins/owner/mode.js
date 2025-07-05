const handler = async (m, { conn, args, text, command, reply, isCreator }) => {

  const mode = command.toLowerCase()
  
  if (mode === "public") {
    if (global.isPublic) {
      return reply("✅ Bot sudah dalam mode *public*!")
    }
    
    global.isPublic = true
    conn.public = true
    
    reply(`✅ Bot berhasil diubah ke mode *PUBLIC*
    
📢 *Mode Public Aktif*
• Semua user dapat menggunakan bot
• Command dapat diakses oleh siapa saja
• Bot akan merespon pesan dari semua user

⚙️ *Status:* Online untuk semua`)
    
  } else if (mode === "self") {
    if (!global.isPublic) {
      return reply("✅ Bot sudah dalam mode *self*!")
    }
    
    global.isPublic = false
    conn.public = false
    
    reply(`✅ Bot berhasil diubah ke mode *SELF*
    
🔒 *Mode Self Aktif*
• Hanya owner yang dapat menggunakan bot
• Command hanya dapat diakses oleh owner
• Bot tidak akan merespon user lain

⚙️ *Status:* Private untuk owner saja`)
    
  } else if (mode === "mode" || mode === "status") {
    const currentMode = global.isPublic ? "PUBLIC" : "SELF"
    const modeIcon = global.isPublic ? "📢" : "🔒"
    const modeDesc = global.isPublic ? 
      "Bot dapat digunakan oleh semua user" : 
      "Bot hanya dapat digunakan oleh owner"
    
    reply(`${modeIcon} *BOT MODE STATUS*

🤖 *Current Mode:* ${currentMode}
📝 *Description:* ${modeDesc}
⏰ *Last Changed:* ${new Date().toLocaleString('id-ID')}

💡 *Available Commands:*
• \`.public\` - Switch to public mode
• \`.self\` - Switch to self mode
• \`.mode\` - Check current mode`)
  }
}

handler.help = ["mode", "self", "public"]
handler.tags = ["owner"]
handler.command = ["mode", "self", "public"]
handler.owner = true
