const puppeteer = require('puppeteer')
const logger = require('./logger')(module)
const utils = require('./utils')
const { faker } = require('@faker-js/faker')
const http = require('http')
const crypto = require('crypto')
const fs = require('fs/promises')

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
		if (!(await page.content()).includes('Logout')) {
			logger.error(`Failed to register ${user.username}`)
			return false
		}
		logger.log(`Registered ${user.username}`)
	}
	const cookie = decodeURIComponent((await page.cookies()).find(c => c.name === 'session').value)
	if (!cookie.startsWith('js:Buffer:')) {
		logger.error(`Invalid cookie format: ${cookie}`)
		return false
	}
	{
		const logoutBtn = await page.$('::-p-text("Logout")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			logoutBtn.click()
		])
		logger.log(`Logged out as ${user.username}`)
		if ((await page.content()).includes('Logout')) {
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
		if (!(await page.content()).includes('Logout')) {
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
		const newThreadBtn = await page.$('::-p-text("New Thread")')
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
			page.click('::-p-text("Submit")')
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
			page.click('::-p-text("Reply")')
		])
		const content = await page.content()
		if (!content.includes(reply)) {
			logger.error(`Failed to reply to thread ${new URL(page.url()).pathname}`)
			return false
		}
	}
	{
		const profileBtn = await page.$('::-p-text("Profile")')
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
		const PROFILE_PIC = 'capoo.jpg'
		const changeProfilePictureBtn = await page.$('::-p-text("Change Profile Picture")')
		await changeProfilePictureBtn.click()
		const fileInput = await page.$('#profile_picture_upload')
		await fileInput.uploadFile(PROFILE_PIC)
		const updateProfilePictureBtn = await page.$('::-p-text("Update Profile Picture")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			updateProfilePictureBtn.click()
		])
		const img = await page.$('#profilePicture')
		const src = await img.evaluate(el => el.src)
		const hasher = crypto.createHash('sha256')
		hasher.update(await fs.readFile(PROFILE_PIC))
		const hash1 = hasher.digest('hex')
		const hash2 = await new Promise(resolve => {
			http.get(src, res => {
				const hasher = crypto.createHash('sha256')
				res.on('data', data => hasher.update(data))
				res.on('end', () => resolve(hasher.digest('hex')))
			})
		})
		if (hash1 !== hash2) {
			logger.error(`Failed to update profile picture using file`)
			return false
		}
		logger.log(`Updated profile picture using file`)
	}
	{
		const PROFILE_PIC_URL = 'https://i.imgur.com/U2YIR6K.jpeg'
		const changeProfilePictureBtn = await page.$('::-p-text("Change Profile Picture")')
		await changeProfilePictureBtn.click()
		const urlField = await page.$('#profile_picture_url')
		await urlField.type(PROFILE_PIC_URL)
		const updateProfilePictureBtn = await page.$('::-p-text("Update Profile Picture")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			updateProfilePictureBtn.click()
		])
		const img = await page.$(`img[src="${PROFILE_PIC_URL}"]`)
		if (!img) {
			logger.error(`Failed to update profile picture using url`)
			return false
		}
		logger.log(`Updated profile picture using url`)
	}
	const newPassword = faker.internet.password()
	{
		const changePasswordBtn = await page.$('::-p-text("Change Password")')
		await page.type('input[name="old_password"]', 'not password')
		await page.type('input[name="new_password"]', newPassword)
		await page.type('input[name="confirm_password"]', newPassword)
		const alertPromise = new Promise(resolve => {
			page.once('dialog', async dialog => {
				if (dialog.type() !== 'alert') return resolve(false)
				logger.log(`alert message received: ${dialog.message()}`)
				await dialog.accept()
				resolve(true)
			})
		})
		await changePasswordBtn.click()
		if (!(await alertPromise)) {
			logger.error('Expected alert message not received')
			return false
		}
		await page.reload({
			waitUntil: 'load'
		})

		const changePasswordBtn2 = await page.$('::-p-text("Change Password")')
		await page.type('input[name="old_password"]', user.password)
		await page.type('input[name="new_password"]', newPassword)
		await page.type('input[name="confirm_password"]', newPassword)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			changePasswordBtn2.click()
		])
		logger.log(`Changed password for ${user.username}`)
	}
	{
		const logoutBtn = await page.$('::-p-text("Logout")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			logoutBtn.click()
		])
		logger.log(`Logged out as ${user.username}`)
		if ((await page.content()).includes('Logout')) {
			logger.error(`Failed to logout ${user.username}`)
			return false
		}
		const loginBtn = await page.$('::-p-text("Login")')
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			loginBtn.click()
		])
		await page.type('input[name="username"]', user.username)
		await page.type('input[name="password"]', newPassword)
		await Promise.all([
			page.waitForNavigation({
				waitUntil: 'load'
			}),
			page.click('input[type="submit"]')
		])
		if (!(await page.content()).includes('Logout')) {
			logger.error(`Failed to login as ${user.username} after password change`)
			return false
		}
	}
	// await page.screenshot({
	// 	path: 'screenshot.png',
	// 	fullPage: true
	// })
	return true
}
