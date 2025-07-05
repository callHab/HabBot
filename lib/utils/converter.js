import { spawn } from "child_process"
import fs from "fs"
import path from "path"

export const toAudio = (buffer, ext) => {
  return new Promise((resolve, reject) => {
    const tmp = path.join("./tmp", `${Date.now()}.${ext}`)
    const out = tmp + ".mp3"
    
    fs.writeFileSync(tmp, buffer)
    
    spawn("ffmpeg", [
      "-y",
      "-i", tmp,
      "-ac", "2",
      "-b:a", "128k",
      "-ar", "44100",
      "-f", "mp3",
      out
    ])
    .on("error", reject)
    .on("close", () => {
      fs.unlinkSync(tmp)
      if (fs.existsSync(out)) {
        resolve({
          data: fs.readFileSync(out),
          filename: out
        })
        fs.unlinkSync(out)
      } else {
        reject(new Error("Conversion failed"))
      }
    })
  })
}

export const toPTT = (buffer, ext) => {
  return new Promise((resolve, reject) => {
    const tmp = path.join("./tmp", `${Date.now()}.${ext}`)
    const out = tmp + ".opus"
    
    fs.writeFileSync(tmp, buffer)
    
    spawn("ffmpeg", [
      "-y",
      "-i", tmp,
      "-c:a", "libopus",
      "-b:a", "128k",
      "-vbr", "on",
      "-compression_level", "10",
      out
    ])
    .on("error", reject)
    .on("close", () => {
      fs.unlinkSync(tmp)
      if (fs.existsSync(out)) {
        resolve({
          data: fs.readFileSync(out),
          filename: out
        })
        fs.unlinkSync(out)
      } else {
        reject(new Error("Conversion failed"))
      }
    })
  })
}
