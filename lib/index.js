/**
 * Authentication State Manager
 * Mengelola state autentikasi WhatsApp
 */

import { useMultiFileAuthState } from "bail"
import fs from "fs"
import path from "path"

export const initAuthState = async (sessionDir) => {
  // Ensure session directory exists
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }
  
  // Initialize auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  
  return { state, saveCreds }
}