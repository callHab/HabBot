import { spawn } from "child_process"
import fs from "fs"
import path from "path"

export const writeExif = (media, metadata) => {
  return new Promise((resolve, reject) => {
    const tmp = path.join("./tmp", `${Date.now()}.webp`)
    const tmpExif = path.join("./tmp", `${Date.now()}.exif`)
    
    const exifData = {
      "sticker-pack-id": "com.whatsapp.sticker",
      "sticker-pack-name": metadata.packname || global.packname,
      "sticker-pack-publisher": metadata.author || global.author,
      "emojis": metadata.emojis || ["🤖"]
    }
    
    fs.writeFileSync(tmpExif, JSON.stringify(exifData))
    
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", "-",
      "-vf", "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
      "-f", "webp",
      "-preset", "default",
      "-an",
      "-vsync", "0",
      "-s", "512x512",
      tmp
    ])
    
    ffmpeg.stdin.write(media)
    ffmpeg.stdin.end()
    
    ffmpeg.on("error", reject)
    ffmpeg.on("close", () => {
      if (fs.existsSync(tmp)) {
        resolve(tmp)
      } else {
        reject(new Error("Sticker creation failed"))
      }
      
      if (fs.existsSync(tmpExif)) {
        fs.unlinkSync(tmpExif)
      }
    })
  })
}
