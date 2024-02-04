import express from 'express'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import serveStatic from './middlewares/static.js'
import session from './middlewares/session.js'
import i18n, { supportedLanguages } from './middlewares/i18n.js'
import users from './routes/users.js'
import boards from './routes/boards.js'
import threads from './routes/threads.js'
import admin from './routes/admin.js'
import { sql } from './db.js'
import fs from 'fs-promises-esm'

const app = express()
app.set('view engine', 'ejs')
app.use(serveStatic('public'))
app.use(cookieParser())
app.use(
	session({
		secretkey: crypto.randomBytes(32),
		cookieName: 'session'
	})
)
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(i18n)

app.use((req, res, next) => {
	res.locals.user = req.session.user
	res.locals.isAdmin = req.session.user && req.session.user.role === 'admin'
	res.locals.error = null
	res.locals.languages = supportedLanguages
	next()
})

app.get('/', (req, res) => {
	res.render('index', {
		title: 'Forum',
		boards: sql`select id, name from boards`.all()
	})
})
app.use(users)
app.use(boards)
app.use(threads)
app.use(admin)

// changing how this function works will break your team's service check
app.get('/flaghash', async (req, res) => {
	const suffix = req.query.suffix || ''
	const flag = await fs.readFile('/flag', 'utf-8')
	res.send(
		crypto
			.createHash('sha256')
			.update(flag + suffix)
			.digest('hex')
	)
})

// to prevent node from killing our server
app.use((err, req, res, next) => {})
process.on('uncaughtException', () => {})
process.on('unhandledRejection', () => {})

const PORT = process.env.PORT || 8763
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`)
})
