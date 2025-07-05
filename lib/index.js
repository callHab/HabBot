import { useMultiFileAuthState } from "bail"
import fs from "fs"
import path from "path"

export const initAuthState = async (sessionDir) => {
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  
  return { state, saveCreds }
}
