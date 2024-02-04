const puppeteer = require('puppeteer')
const logger = require('./logger')(module)
const utils = require('./utils')
const { faker } = require('@faker-js/faker')

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

		await page.select('#db-form select', 'exec')
		const tableName1 = faker.string.alpha(1) + faker.string.alphanumeric(15)
		const tableName2 = faker.string.alpha(1) + faker.string.alphanumeric(15)
		const flag1 = utils.fakeFlag()
		const flag2 = utils.fakeFlag()
		await page.evaluate(
			sql => {
				document.querySelector('#db-form textarea').value = sql
			},
			`
			CREATE TABLE ${tableName1} (val int, val2 int);
			CREATE TABLE ${tableName2} (val int, val2 int);
			INSERT INTO ${tableName1} VALUES ('${flag1}', 1);
			INSERT INTO ${tableName2} VALUES ('${flag2}', 2);
		`
		)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('::-p-text("Execute SQL")')
		])
		if (!(await page.content()).includes('successfully')) {
			logger.error(`Failed to create tables ${tableName1} and ${tableName2}`)
			return false
		}
		logger.info(`Created tables ${tableName1} and ${tableName2}`)

		await page.goBack()
		await page.select('#db-form select', 'query')
		await page.evaluate(sql => {
			document.querySelector('#db-form textarea').value = sql
		}, `SELECT * FROM ${tableName1} UNION SELECT * FROM ${tableName2} ORDER BY val2`)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('::-p-text("Execute SQL")')
		])
		const resultJsonText = await page.evaluate(() => document.querySelector('pre').textContent)
		logger.info(`Result: ${resultJsonText}`)

		await page.goBack()
		await page.select('#db-form select', 'exec')
		await page.evaluate(sql => {
			document.querySelector('#db-form textarea').value = sql
		}, `DROP TABLE ${tableName1}; DROP TABLE ${tableName2};`)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('::-p-text("Execute SQL")')
		])
		if (!(await page.content()).includes('successfully')) {
			logger.error(`Failed to drop tables ${tableName1} and ${tableName2}`)
			return false
		}
		logger.info(`Dropped tables ${tableName1} and ${tableName2}`)

		try {
			const minimizedJSONText = JSON.stringify(JSON.parse(resultJsonText))
			const expectedJSONText = JSON.stringify([
				{ val: flag1, val2: 1 },
				{ val: flag2, val2: 2 }
			])
			if (minimizedJSONText !== expectedJSONText) {
				logger.error(`Unexpected result: ${minimizedJSONText} !== ${expectedJSONText}`)
				return false
			}
		} catch (e) {
			logger.error(`Failed to parse JSON`)
			return false
		}
	}
	// await page.screenshot({
	// 	path: 'screenshot.png',
	// 	fullPage: true
	// })
	return true
}
