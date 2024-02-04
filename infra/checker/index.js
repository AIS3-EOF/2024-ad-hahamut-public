const puppeteer = require('puppeteer')
const fs = require('fs/promises')
const path = require('path')

const url = new URL(process.argv[2])
const admin = {
	username: process.env.ADMIN_USERNAME || 'admin',
	password: process.env.ADMIN_PASSWORD || 'admin'
}
const matchRegex = process.argv[3] ? new RegExp(process.argv[3]) : /^checker-.*\.js$/

const delay = (ms, val) => new Promise(resolve => setTimeout(() => resolve(val), ms))
;(async () => {
	const browser = await puppeteer.launch({
		headless: 'new'
	})

	const files = (await fs.readdir(__dirname)).filter(f => matchRegex.test(f))
	for (const file of files) {
		const start = Date.now()

		const { run, resultOverride } = require(path.join(__dirname, file))
		const context = await browser.createIncognitoBrowserContext()
		let good = false
		try {
			good = await Promise.race([run(context, { url, admin }), delay(15000, false)])
		} catch (e) {
			console.log(`Checker ${file} failed with error:`)
			console.log(e)
		} finally {
			try {
				await context.close()
			} catch (err) {
				console.log(`Something went wrong while closing context for ${file}:`)
				console.log(err)
			}
		}
		if (typeof resultOverride !== 'undefined') {
			good = resultOverride
			console.log(`Checker ${file} result overridden to ${good}`)
		}

		const time = Date.now() - start
		console.log(`Checker ${file} ${good ? 'passed' : 'failed'} in ${time}ms`)
		console.log()

		if (!good) {
			process.exit(1)
		}
	}

	await browser.close()
	process.exit(0) // ignore delay promises
})()
