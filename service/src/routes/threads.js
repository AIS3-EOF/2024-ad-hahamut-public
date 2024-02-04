import { Router } from 'express'
import { sql } from '../db.js'
import { orZero, loginRequired } from '../utils.js'

const router = Router()

router.get('/thread/:id', (req, res) => {
	const id = orZero(req.params.id)

	const thread = sql`
		select t.id, t.title, datetime(t.created_at, 'localtime') as created_at, b.name as board, b.id as board_id, c.name as category, c.id as category_id
		from threads t join boards b on t.board_id=b.id join categories c on t.category_id=c.id
		where t.id = ${id}
	`.get()
	if (!thread) {
		res.status(404).render('error', {
			title: 'Thread not found',
			error: 'The thread you requested does not exist.'
		})
		return
	}
	const posts = sql`
		select p.id, p.thread_id, p.author_id, p.content, p.created_at, u.username as author
		from posts p
		join users u on u.id = p.author_id
		where p.thread_id = ${id}
		order by p.created_at asc
	`.all()
	res.render('thread', {
		title: thread.title,
		thread,
		posts
	})
})

router.post('/thread/:id/reply', loginRequired, (req, res) => {
	const id = orZero(req.params.id)

	const thread = sql`
		select t.id, t.title, datetime(t.created_at, 'localtime') as created_at, b.name as board, b.id as board_id, c.name as category, c.id as category_id
		from threads t join boards b on t.board_id=b.id join categories c on t.category_id=c.id
		where t.id = ${id}
	`.get()
	if (!thread) {
		res.status(404).render('error', {
			title: 'Thread not found',
			error: 'The thread you requested does not exist.'
		})
		return
	}
	const content = req.body.content.trim()
	if (content.length === 0) {
		res.status(400).render('error', {
			title: 'Bad request',
			error: 'You must provide content for your post.'
		})
		return
	}
	sql`
		insert into posts (thread_id, author_id, content)
		values (${id}, ${req.session.user.id}, ${content})
	`.run()
	res.redirect(`/thread/${id}`)
})

export default router
