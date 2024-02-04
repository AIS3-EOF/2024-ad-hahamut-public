const puppeteer = require('puppeteer')
const logger = require('./logger')(module)
const utils = require('./utils')
const { fakerZH_TW: faker } = require('@faker-js/faker')

/**
 * @param {puppeteer.BrowserContext} context
 * @param {{ url: URL, admin: { username: string, password: string } }} options
 * @returns {Promise<boolean>}
 */
exports.run = async (context, { url }) => {
	const user = {
		username: utils.genStr(faker.internet.userName, {
			min: 8,
			max: 20
		}),
		password: faker.internet.password()
	}
	const page = await context.newPage()
	{
		await page.setExtraHTTPHeaders({
			'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5,zh-CN;q=0.4,ko;q=0.3'
		})
		await page.goto(url.href)
		const content = await page.content()
		if (!content.includes('哈哈姆特') || !content.includes('討論版') || !content.includes('登入')) {
			logger.error(`Failed to find expected content in zh-TW`)
			return false
		}
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.select('nav select', 'zh-TW')
		])
	}
	{
		await page.goto(new URL('/register', url).href)
		await page.waitForSelector('form')
		await page.type('input[name="username"]', user.username)
		await page.type('input[name="password"]', user.password)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('input[type="submit"]')
		])
		if (!(await page.content()).includes('登出')) {
			logger.error(`Failed to register ${user.username}`)
			return false
		}
		logger.log(`Registered ${user.username}`)
	}
	{
		const logoutBtn = await page.$('::-p-text("登出")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			logoutBtn.click()
		])
		logger.log(`Logged out as ${user.username}`)
		if ((await page.content()).includes('登出')) {
			logger.error(`Failed to logout ${user.username}`)
			return false
		}
	}
	{
		await page.goto(new URL('/login', url).href)
		await page.waitForSelector('form')
		await page.type('input[name="username"]', user.username)
		await page.type('input[name="password"]', user.password)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('input[type="submit"]')
		])
		if (!(await page.content()).includes('登出')) {
			logger.error(`Failed to login as ${user.username}`)
			return false
		}
		logger.log(`Logged in as ${user.username}`)
	}

	{
		const els = await page.$$('a[href^="/board/"]')
		const href = await page.evaluate(el => el.href, utils.choice(els))
		logger.log(`Visiting ${new URL(href).pathname}`)
		await page.goto(href, {
			waitUntil: 'load'
		})
	}

	{
		const thread = {
			title: faker.lorem.sentence(),
			content: faker.lorem.paragraph()
		}
		const newThreadBtn = await page.$('::-p-text("發表文章")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			newThreadBtn.click()
		])
		await page.type('input[name="post_title"]', thread.title)
		await page.type('textarea[name="content"]', thread.content)
		const categories = await page.$$('select[name="category"] option')
		await page.select('select[name="category"]', await page.evaluate(el => el.value, utils.choice(categories)))
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('button::-p-text("發表")')
		])
		const content = await page.content()
		if (!content.includes(thread.title) || !content.includes(thread.content)) {
			logger.error(`Failed to create new thread ${thread.title}`)
			return false
		}
		const url = new URL(page.url())
		logger.log(`Created new thread ${url.pathname}`)
	}
	{
		const reply = faker.lorem.paragraph()
		await page.type('textarea[name="content"]', reply)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('::-p-text("回覆")')
		])
		const content = await page.content()
		if (!content.includes(reply)) {
			logger.error(`Failed to reply to thread ${new URL(page.url()).pathname}`)
			return false
		}
	}
	{
		const profileBtn = await page.$('::-p-text("個人檔案")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			profileBtn.click()
		])
		const editBtn = await page.$('::-p-text("Edit")')
		await editBtn.click()
		const description = faker.lorem.paragraph()
		await page.type('textarea[name="description"]', description)
		const updateDescBtn = await page.$('::-p-text("Update Description")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			updateDescBtn.click()
		])
		const content = await page.content()
		if (!content.includes(description)) {
			logger.error(`Failed to update profile description`)
			return false
		}
	}
	{
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.select('nav select', 'ja-JP')
		])
		const content = await page.content()
		if (
			!content.includes('ハハムト') ||
			!content.includes('ログアウト') ||
			!content.includes('言語を選択してください')
		) {
			logger.error(`Failed to find expected content in ja-JP`)
			return false
		}
	}
	// await page.screenshot({
	// 	path: 'screenshot.png',
	// 	fullPage: true
	// })
	return true
}
