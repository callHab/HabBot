/**
 * Example Plugin - Ping
 * Tests the bot's response time
 *
 * @plugin
 * @name ping
 * @category example
 * @description Test bot response time
 * @usage .ping
 */

const handler = async (m, { conn }) => {
  const start = new Date().getTime()
  await reply("Pinging...")
  const end = new Date().getTime()

  const responseTime = end - start

  reply(`🏓 Pong!\nResponse time: ${responseTime}ms`)
}

handler.help = ["ping"]
handler.tags = ["info"]
handler.command = ["ping"]

export default handler
