export function orZero(str) {
	const n = parseInt(str)
	return isNaN(n) ? 0 : n
}

export function loginRequired(req, res, next) {
	if (!req.session.user) {
		res.redirect('/login?next=' + encodeURIComponent(req.originalUrl))
		return
	}
	next()
}

export function adminRequired(req, res, next) {
	loginRequired(req, res, () => {
		if (req.session.user.role !== 'admin') {
			res.status(403).send('Forbidden')
		}
		next()
	})
}

export function coerce(val) {
	if (typeof val !== 'string') return val
	if (val === 'true') return true
	if (val === 'false') return false
	if (val === 'null') return null
	if (val === 'undefined') return undefined
	if (val.startsWith('js:')) {
		const i = val.indexOf(':', 3)
		return globalThis[val.slice(3, i)](...val.slice(i + 1).split(','))
	}
	return val
}

export function bufferToString(buf) {
	return 'js:Buffer:' + buf.toString('base64') + ',base64'
}

export function combine(...args) {
	const tmp = [args]
	while (tmp.length > 0) {
		const [obj, body] = tmp.pop()
		for (const [key, value] of Object.entries(body)) {
			if (typeof value === 'object') {
				if (typeof obj[key] !== 'object') obj[key] = {}
				tmp.push([obj[key], value])
			} else {
				obj[key] = coerce(value)
			}
		}
	}
	return args[0]
}
