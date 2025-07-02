/**
 * Hidetag Plugin - Mention semua member grup tanpa terlihat
 *
 * @plugin
 * @name hidetag
 * @category group
 * @description Mention semua member grup secara tersembunyi (hanya admin bisa gunakan)
 * @usage .hidetag Halo semua!
 */

const handler = async (m, { conn, text, participants, isAdmin, isBotAdmin, isGroup, reply }) => {
  if (!isGroup) return reply("❗ Perintah ini hanya bisa digunakan di grup.")
  if (!isAdmin) return reply("❗ Anda bukan admin grup. Silakan hubungi admin untuk menggunakan perintah ini.") 
  if (!isBotAdmin) return reply("❗ Bot harus admin grup untuk menggunakan perintah ini.")
  if (!text) return reply("❗ Silakan masukkan teks. Contoh: .hidetag Halo semua!")

  const teks = text
  const mentionIds = participants.map(p => p.id)

  await reply(teks, null, { mentions: mentionIds })
}

handler.help = ["hidetag <teks>"]
handler.tags = ["group"]
handler.command = ["hidetag"]

export default handler
