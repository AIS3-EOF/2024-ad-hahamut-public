import crypto from 'crypto'
import { bufferToString, coerce } from '../utils.js'

export function encrypt(key, buf) {
	const iv = crypto.randomBytes(16)
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
	const encrypted = Buffer.concat([cipher.update(buf), cipher.final()])
	const tag = cipher.getAuthTag()
	return Buffer.concat([iv, tag, encrypted])
}
export function decrypt(key, buf) {
	try {
		const iv = buf.subarray(0, 16)
		const tag = buf.subarray(16, 32)
		const encrypted = buf.subarray(32)
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
		decipher.setAuthTag(tag)
		return decipher.update(encrypted)
	} catch (err) {
		return null
	}
}

export default function session(options) {
	const { secretKey = Buffer.from('secret_key'), cookieName = 'session', maxAge = 86400000 } = options
	const key = crypto.createHash('sha256').update(secretKey).digest()

	return (req, res, next) => {
		const cookie = req.cookies[cookieName]
		if (cookie) {
			const decrypted = decrypt(key, coerce(cookie))
			if (decrypted) {
				try {
					req.session = JSON.parse(decrypted)
				} catch {}
			}
		}
		if (!req.session) {
			req.session = {}
		}
		req.session.save = () => {
			const encryptedBuf = encrypt(key, Buffer.from(JSON.stringify(req.session), 'utf-8'))
			res.cookie(cookieName, bufferToString(encryptedBuf), { maxAge, httpOnly: true })
		}
		next()
	}
}
