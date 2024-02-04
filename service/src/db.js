import sqlite from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export const db = sqlite(process.env.DB_PATH || ':memory:')

export function sql(strs, ...vals) {
	const sql = strs.join?.('?') ?? strs
	return db.prepare(sql).bind(vals)
}

const userTableExists = !!sql`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`.get()
if (!userTableExists) {
	const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql')
	if (fs.existsSync(schemaPath)) {
		db.exec(fs.readFileSync(schemaPath, 'utf-8'))
	}
}

if (process.env.ADMIN_PASSWORD) {
	sql`UPDATE users SET password = ${process.env.ADMIN_PASSWORD} WHERE username = 'admin'`.run()
}
