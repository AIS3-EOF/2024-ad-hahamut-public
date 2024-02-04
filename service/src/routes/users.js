import { Router } from 'express'
import { sql } from '../db.js'
import { loginRequired, combine } from '../utils.js'
import multer from 'multer'
import fs from 'fs-promises-esm'
import path from 'path'

const router = Router()
const upload = multer({ dest: '/tmp' })

router.get('/register', (req, res) => {
	res.render('register', {
		title: 'Register'
	})
})

router.post('/register', (req, res) => {
	const { username, password, role } = req.body
	if (username.length < 8) {
		res.render('register', {
			title: 'Register',
			error: 'Username must be at least 8 characters'
		})
		return
	}
	if (password.length < 8) {
		res.render('register', {
			title: 'Register',
			error: 'Password must be at least 8 characters'
		})
		return
	}
	try {
		const user = sql`
		insert into users (username, password, role) values (${username}, ${password}, ${role})
		returning id, username, role
	`.get()
		req.session.user = user
		req.session.save()
		res.redirect('/')
	} catch (err) {
		res.render('register', {
			title: 'Register',
			error: err.message
		})
	}
})

router.get('/login', (req, res) => {
	res.render('login', {
		title: 'Login'
	})
})

router.post('/login', (req, res) => {
	const { username, password } = req.body
	const user = sql`
		select id, username, role from users where username=${username} and password=${password}
	`.get()
	if (user) {
		req.session.user = user
		req.session.save()
		res.redirect(req.query.next || '/')
	} else {
		res.render('login', {
			title: 'Login',
			error: 'Invalid username or password'
		})
	}
})

router.get('/me', (req, res) => {
	res.json(req.session.user)
})

router.post('/update', (req, res) => {
	combine(req.session, req.body)
	req.session.save()
	res.redirect(req.headers.referer || '/')
})

router.get('/profile/:id', (req, res) => {
	const page_user = sql`select * from users where id=${req.params.id}`.get()
	if (!page_user) {
		res.render('error', {
			title: 'Error',
			error: 'User not found'
		})
		return
	}
	res.render('profile', {
		title: 'Profile',
		page_user
	})
})

router.post('/profile/:id/description', loginRequired, (req, res) => {
	const { description } = req.body
	sql`
		update users set description=${description} where id=${req.params.id}
	`.run()
	res.redirect(`/profile/${req.params.id}`)
})

router.post('/profile/:id/password', loginRequired, (req, res) => {
	const { new_password } = req.body
	sql`
		update users set password=${new_password} where id=${req.params.id}
	`.run()
	res.redirect(`/profile/${req.params.id}`)
})

router.post(
	'/profile/:id/profile_picture',
	loginRequired,
	upload.single('profile_picture_upload'),
	async (req, res) => {
		const user = sql`select username from users where id=${req.params.id}`.get()
		let profile_picture_url = null
		if (req.file) {
			const ext = path.extname(req.file.originalname)
			profile_picture_url = `/uploads/${user.username}${ext}`
			await fs.copyFile(req.file.path, 'public' + profile_picture_url)
		} else if (req.body.profile_picture_url) {
			profile_picture_url = req.body.profile_picture_url
		}
		if (!profile_picture_url) {
			res.render('error', {
				title: 'Error',
				error: 'No profile picture provided'
			})
			return
		}
		sql`
			update users set profile_picture_url=${profile_picture_url} where id=${req.params.id}
		`.run()
		res.redirect(`/profile/${req.params.id}`)
	}
)

export default router
