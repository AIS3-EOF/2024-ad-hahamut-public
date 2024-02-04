const path = require('path')

module.exports = module => {
	const name = path.basename(module.filename).replace(/\.js$/, '')
	const prefix = `[${name}]`
	return {
		log: (...args) => console.log(prefix, ...args),
		info: (...args) => console.info(prefix, ...args),
		error: (...args) => console.error(prefix, ...args),
		warn: (...args) => console.warn(prefix, ...args),
		debug: (...args) => console.debug(prefix, ...args),
		trace: (...args) => console.trace(prefix, ...args)
	}
}
