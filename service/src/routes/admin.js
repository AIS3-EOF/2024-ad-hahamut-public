import { Router } from 'express'
import { sql, db } from '../db.js'
import { adminRequired } from '../utils.js'
import * as tmp from 'tmp-promise'
import { spawn } from 'child_process'
import fs from 'fs-promises-esm'
import path from 'path'

const router = Router()

router.get('/admin', adminRequired, (req, res) => {
	res.render('admin', {
		title: 'Admin Panel',
		users: sql`select id, username, role from users`.all()
	})
})

router.post('/admin/database', adminRequired, (req, res) => {
	const { action, sql } = req.body
	if (action === 'query') {
		const result = db.prepare(sql).all()
		res.render('message', {
			title: 'Query executed successfully',
			message: `<pre>` + JSON.stringify(result, null, 2) + `</pre>`
		})
	} else if (action === 'exec') {
		try {
			db.exec(sql)
			res.render('message', {
				title: 'SQL executed successfully',
				message: `The SQL was executed successfully.`
			})
		} catch (e) {
			res.status(400).render('error', {
				title: 'Bad request',
				error: e.message
			})
		}
	} else {
		res.status(400).render('error', {
			title: 'Bad request',
			error: 'Invalid action.'
		})
	}
})

router.post('/admin/backup', adminRequired, async (req, res) => {
	const name = req.body.name
	const dest = path.join('public', name + '.tar.gz')

	const backup = req.body.backup || {}
	if (!backup) {
		res.status(400).render('error', {
			title: 'Bad request',
			error: 'You must select at least one table to backup.'
		})
		return
	}
	const { path: tmpdir, cleanup } = await tmp.dir({
		unsafeCleanup: true
	})
	for (const tbl of ['boards', 'categories', 'threads', 'posts', 'users']) {
		if (backup[tbl]) {
			await fs.writeFile(path.join(tmpdir, tbl + '.json'), JSON.stringify(sql(`SELECT * FROM ${tbl}`).all()))
		}
	}

	const child = spawn('tar', ['-cf', path.resolve(dest), ...Object.keys(backup).map(x => x + '.json')], {
		cwd: tmpdir
	})
	child.on('exit', () => {
		cleanup()
		res.render('message', {
			title: 'Backup created successfull',
			message: `Download the file <a href="/${name}.tar.gz">here</a>!`
		})
	})
})

export default router
