const puppeteer = require('puppeteer')
const logger = require('./logger')(module)
const utils = require('./utils')
const { faker } = require('@faker-js/faker')
const cp = require('child_process')

/**
 * @param {puppeteer.BrowserContext} context
 * @param {string} url
 * @param {string} username
 * @param {import('./logger')()} lg
 * @returns {Promise<boolean>}
 */
const visitUserAndEditDescription = async (context, url, username, lg = logger) => {
	const page = await context.newPage()
	page.on('dialog', async dialog => {
		// in case there are alert(), prompt(), confirm() XSS
		lg.log(`Dialog message for ${username}: ${dialog.message()}`)
		await dialog.accept()
	})
	try {
		lg.log(`Visiting profile ${username}`)
		await page.goto(url, {
			waitUntil: 'load',
			timeout: 5000
		})
		const editBtn = await page.$('::-p-text("Edit")')
		if (!editBtn) {
			lg.error(`Failed to find Edit button in profile page`)
			return false
		}
		await editBtn.click()
		const ta = await page.$('textarea[name="description"]')
		const description = await page.evaluate(el => el.value, ta)
		if (typeof description !== 'string') {
			lg.error(`Failed to find description in profile page`)
			return false
		}
		await page.evaluate(el => (el.value = ''), ta)
		const newDescription = description + '\n\nVisited by admin :)\n'
		// await page.type('textarea[name="description"]', newDescription)

		// this is much faster than page.type()
		await page.evaluate((el, newDescription) => (el.value = newDescription), ta, newDescription)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('::-p-text("Update Description")')
		])
		if (!(await page.content()).includes('Visited by admin :)')) {
			lg.error(`Failed to update description in profile page`)
			return false
		}
		lg.log(`Updated description in profile page for ${username}`)
		return true
	} catch (err) {
		lg.error(`Failed to visit profile ${username}`)
		lg.error(err)
		return false
	} finally {
		await page.close()
	}
}
exports.visitUserAndEditDescription = visitUserAndEditDescription

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
		const randBoardName = faker.string.alphanumeric(10)
		await page.type('input[name="name"]', randBoardName)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('button[type="submit"]')
		])
		if (!(await page.content()).includes(randBoardName)) {
			logger.error(`Failed to create board ${randBoardName}`)
			return false
		}
		logger.log(`Created board ${randBoardName}`)

		const deleteBtn = await page.$(`li > a::-p-text("${randBoardName}") + a`)
		if ((await deleteBtn.evaluate(el => el.textContent)) !== 'Delete') {
			logger.error(`Failed to find delete button for ${randBoardName}`)
			return false
		}
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			deleteBtn.click()
		])
		if ((await page.content()).includes(randBoardName)) {
			logger.error(`Failed to delete board ${randBoardName}`)
			return false
		}
		logger.log(`Deleted board ${randBoardName}`)
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
		const [username, url] = await profileLinks[0].evaluate(el => [el.textContent, el.href])
		const good = visitUserAndEditDescription(context, url, username)
		if (!good) {
			logger.error(`Failed to visit profile ${username}`)
			return false
		}
	}
	{
		await page.goto(new URL('/admin', url).href)
		await (await page.$('form[action$=backup] input[name="backup[boards]"]')).click()
		await (await page.$('form[action$=backup] input[name="backup[categories]"]')).click()
		await (await page.$('form[action$=backup] input[name="backup[users]"]')).click()
		const submitBtn = await page.$('form[action$=backup] input[type=submit]')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			submitBtn.click()
		])
		const downloadLink = await page.$('a[href*=backup]')
		const downloadUrl = await downloadLink.evaluate(el => el.href)
		logger.log(`Downloaded backup from ${downloadUrl}`)
		const curl = cp.spawn('curl', ['--', downloadUrl])
		const tarList = cp.spawn('tar', ['tf', '-'])
		curl.stdout.pipe(tarList.stdin)
		const tarListOut = []
		tarList.stdout.on('data', data => tarListOut.push(data))
		await new Promise((resolve, reject) => {
			tarList.on('close', code => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error(`tar exited with code ${code}`))
				}
			})
		})
		const tarListOutStr = Buffer.concat(tarListOut).toString()
		const fileList = tarListOutStr
			.split('\n')
			.map(s => s.trim())
			.filter(s => s.length > 0)
			.sort()
		const expectedFileList = ['boards.json', 'categories.json', 'users.json']
		if (fileList.toString() !== expectedFileList.toString()) {
			logger.error(`Expected file list ${expectedFileList} but got ${fileList}`)
			return false
		}
		logger.log(`Verified backup file list`)
	}
	{
		await page.goto(new URL('/', url).href)
		const viewAsRegularUserBtn = await page.$('::-p-text("View as Regular User")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			viewAsRegularUserBtn.click()
		])
		const adminBtn = await page.$('a[href="/admin"]')
		if (adminBtn) {
			logger.error(`Found admin button in regular user homepage`)
			return false
		}
	}
	// await page.screenshot({
	// 	path: 'screenshot.png',
	// 	fullPage: true
	// })
	return true
}
