import crypto from 'crypto'

const SECRET = process.env.VIDEO_TOKEN_SECRET ?? 'vybeline-stream-secret-key-32!!'

function getKey(): Buffer {
  return crypto.scryptSync(SECRET, 'vyb-salt', 32)
}

export function encodeVideoId(videoId: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(videoId, 'utf8'), cipher.final()])
  return Buffer.concat([iv, encrypted]).toString('base64url')
}

export function decodeVideoToken(token: string): string | null {
  try {
    const buf = Buffer.from(token, 'base64url')
    const iv = buf.subarray(0, 16)
    const encrypted = buf.subarray(16)
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
