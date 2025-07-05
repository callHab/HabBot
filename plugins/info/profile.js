const handler = async (m, { conn, reply, pushname, db, sender, quoted }) => {
  let target = sender
  
  if (quoted) {
    target = quoted.sender
  } else if (m.mentionedJid?.length > 0) {
    target = m.mentionedJid[0]
  } else if (args[1]?.includes("@")) { // Added args[1] check for direct mention
    target = args[1].replace("@", "") + "@s.whatsapp.net"
  }
  
  const user = db.getUser(target)
  const isPremium = db.isPremium(target)
  const targetName = target === sender ? pushname : target.split("@")[0]
  
  let premiumInfo = "❌ No"
  if (isPremium) {
    if (user.premiumExpire === 0) {
      premiumInfo = "✅ Yes (Permanent)"
    } else {
      const remaining = Math.ceil((user.premiumExpire - Date.now()) / (24 * 60 * 60 * 1000))
      premiumInfo = `✅ Yes (${remaining} days left)`
    }
  }
  
  const joinDate = new Date(user.joinDate).toLocaleDateString("id-ID")
  const lastReset = new Date(user.lastLimitReset).toLocaleDateString("id-ID")
  
  const profile = `
👤 *USER PROFILE*

📱 *Name:* ${targetName}
🆔 *ID:* ${target.split("@")[0]}
🔰 *Premium:* ${premiumInfo}
⏳ *Limit:* ${isPremium ? "♾️ Unlimited" : user.limit}
📊 *Total Commands:* ${user.totalCommands}
📅 *Join Date:* ${joinDate}
🔄 *Last Limit Reset:* ${lastReset}

${target === sender ? "📝 *This is your profile*" : "📝 *Profile of mentioned user*"}
`

  reply(profile)
}

handler.help = ["profile", "me"]
handler.tags = ["info"]
handler.command = ["profile", "me", "myprofile"]

export default handler
