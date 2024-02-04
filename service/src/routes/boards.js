import { Router } from 'express'
import { sql, db } from '../db.js'
import { orZero, loginRequired, adminRequired } from '../utils.js'

const router = Router()

router.get('/board/:id', (req, res) => {
	const board = sql`select id, name from boards where id=${req.params.id}`.get()
	if (!board) {
		res.status(404).render('error', {
			title: 'Board not found',
			error: 'The board you requested does not exist.'
		})
		return
	}
	const cat = orZero(req.query.category)
	const threads = sql`
		select t.id, t.title, datetime(t.created_at, 'localtime') as created_at, u.username as author, c.name as category, c.id as category_id
		from threads t join users u on t.author_id=u.id join categories c on t.category_id=c.id
		where t.board_id=${req.params.id} and (category_id=${cat} or ${cat}=0)
		order by t.created_at desc
	`.all()
	const categories = sql`
		select c.id, c.name
		from categories c join boards b on c.board_id=b.id
		where b.id=${req.params.id}
	`.all()
	res.render('board', {
		title: board.name,
		board,
		threads,
		categories
	})
})

router.get('/board/:id/new-thread', loginRequired, (req, res) => {
	const board = sql`select id, name from boards where id=${req.params.id}`.get()
	if (!board) {
		res.status(404).render('error', {
			title: 'Board not found',
			error: 'The board you requested does not exist.'
		})
		return
	}
	const categories = sql`select id, name from categories where board_id=${req.params.id}`.all()
	res.render('new-thread', {
		title: `New thread in ${board.name}`,
		board,
		categories
	})
})

router.post('/board/:id/new-thread', loginRequired, (req, res) => {
	const board = sql`select id, name from boards where id=${req.params.id}`.get()
	if (!board) {
		res.status(404).render('error', {
			title: 'Board not found',
			error: 'The board you requested does not exist.'
		})
		return
	}
	if (req.query.preview) {
		const categories = sql`select id, name from categories where board_id=${req.params.id}`.all()
		res.render('new-thread', {
			title: `New thread in ${board.name}`,
			board,
			categories,
			...req.body
		})
		return
	}
	const title = req.body.post_title.trim()
	const content = req.body.content.trim()
	const category = orZero(req.body.category)
	if (title.length < 1 || content.length < 1) {
		res.render('error', {
			title: 'Error',
			error: 'Title or content cannot be empty.'
		})
		return
	}
	try {
		const thread = sql`
			insert into threads (title, board_id, author_id, category_id)
			values (${title}, ${req.params.id}, ${req.session.user.id}, ${category})
		`.run()
		const post = sql`
			insert into posts (thread_id, author_id, content)
			values (${thread.lastInsertRowid}, ${req.session.user.id}, ${content})
		`.run()
		res.redirect(`/thread/${thread.lastInsertRowid}`)
	} catch (err) {
		res.render('error', {
			title: 'Error',
			error: err.message
		})
	}
})

router.post('/board', adminRequired, (req, res) => {
	const name = req.body.name.trim()
	if (name.length < 1) {
		res.render('error', {
			title: 'Error',
			error: 'Name cannot be empty.'
		})
		return
	}
	try {
		sql`insert into boards (name) values (${name})`.run()
		res.redirect('/')
	} catch (err) {
		res.render('error', {
			title: 'Error',
			error: err.message
		})
	}
})

router.delete('/board/:id', adminRequired, (req, res) => {
	sql`delete from boards where id=${req.params.id}`.run()
	res.send('')
})

router.get('/board/:id/category', (req, res) => {
	const board = sql(`select id, name from boards where id=${req.params.id}`).get()
	if (!board) {
		res.status(404).render('error', {
			title: 'Board not found',
			error: 'The board you requested does not exist.'
		})
		return
	}
	const categories = sql(`select id, name from categories where board_id=${board.id}`).all()
	res.json(categories)
})

router.post('/board/:id/category', adminRequired, (req, res) => {
	const name = req.body.name.trim()
	if (name.length < 1) {
		res.render('error', {
			title: 'Error',
			error: 'Name cannot be empty.'
		})
		return
	}
	try {
		sql`insert into categories (name, board_id) values (${name}, ${req.params.id})`.run()
		res.redirect(`/board/${req.params.id}`)
	} catch (err) {
		res.render('error', {
			title: 'Error',
			error: err.message
		})
	}
})

router.delete('/board/:id/category/:cat', adminRequired, (req, res) => {
	sql`delete from categories where board_id=${req.params.id} and id=${req.params.cat}`.run()
	res.send('')
})

export default router
