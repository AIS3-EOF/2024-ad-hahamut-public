const puppeteer = require('puppeteer')
const logger = require('./logger')(module)
const utils = require('./utils')
const { visitUserAndEditDescription } = require('./checker-admin1')

/**
 * @param {puppeteer.BrowserContext} context
 * @param {{ url: URL, admin: { username: string, password: string } }} options
 * @returns {Promise<boolean>}
 */
exports.run = async (context, { url, admin }) => {
	const page = await context.newPage()
	{
		await page.goto(new URL('/login', url).href)
		await page.waitForSelector('form')
		await page.type('input[name="username"]', admin.username)
		await page.type('input[name="password"]', admin.password)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('input[type="submit"]')
		])
		if (!(await page.content()).includes('Logout')) {
			logger.error(`Failed to login as ${admin.username}`)
			return false
		}
		logger.log(`Logged in as ${admin.username}`)
		const adminBtn = await page.$('a[href="/admin"]')
		if (!adminBtn) {
			logger.error(`Failed to find admin button`)
			return false
		}
	}
	{
		const adminBtn = await page.$('a[href="/admin"]')
		if (!adminBtn) {
			logger.error(`Failed to find admin button`)
			return false
		}
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			adminBtn.click()
		])
		const content = await page.content()
		if (!content.includes('Users')) {
			logger.error(`Failed to find Users list in admin page`)
			return false
		}
		if (!content.includes('Backup')) {
			logger.error(`Failed to find Backup button in admin page`)
			return false
		}
		const profileLinks = await page.$$('section ul a[href^="/profile/"]')
		const ps = []
		for (const link of utils.choiceMultiple(profileLinks, 10)) {
			const [username, url] = await link.evaluate(el => [el.textContent, el.href])
			ps.push(visitUserAndEditDescription(context, url, username, logger))
		}
		await Promise.all(ps).catch(_ => _) // we don't care about the result as it is possible to have XSS in profile page
	}
	return true
}
exports.resultOverride = true
