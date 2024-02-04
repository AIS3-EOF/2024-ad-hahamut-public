import fs from 'fs'
import path from 'path'

const extToType = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.ico': 'image/x-icon',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.json': 'application/json',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.eot': 'font/eot'
}

export default function serveStatic(staticDir) {
	return async (req, res, next) => {
		const filePath = path.join(staticDir, req.path)
		try {
			const stat = await fs.promises.stat(filePath)
			if (stat.isFile()) {
				const ext = path.extname(filePath)
				res.setHeader('Content-Type', extToType[ext] || 'text/plain')
				fs.createReadStream(filePath).pipe(res).on('error', next)
			} else {
				next()
			}
		} catch (err) {
			next()
		}
	}
}
