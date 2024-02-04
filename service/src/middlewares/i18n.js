import fs from 'fs-promises-esm'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import ral from 'resolve-accept-language'
import { combine } from '../utils.js'
import { format } from 'util'

const languagesPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../languages')
const languages = new Map()
export const getLanguage = async lang => {
	if (languages.has(lang)) {
		return languages.get(lang)
	}
	const languagePath = path.join(languagesPath, lang + '.yaml')
	try {
		const language = yaml.load(await fs.readFile(languagePath, 'utf-8'))
		languages.set(lang, language)
		return language
	} catch {
		return null
	}
}
export const supportedLanguages = ['en-US', 'zh-TW', 'ja-JP']
export const defaultLanguage = await getLanguage(supportedLanguages[0])
const gettextCache = new Map()
export const lang2gettext = lang => {
	if (gettextCache.has(lang)) {
		return Promise.resolve(gettextCache.get(lang))
	}
	return getLanguage(lang).then(language => {
		const data = combine({}, defaultLanguage)
		if (language) {
			combine(data, language)
		}
		const gettext = (str, ...args) => {
			const s = str.split('.').reduce((result, k) => result?.[k] ?? str, data)
			return format(s, ...args)
		}
		gettextCache.set(lang, gettext)
		return gettext
	})
}
export default function i18n(req, res, next) {
	const lang =
		req.session.lang || ral.default(req.headers['accept-language'] ?? '', supportedLanguages, supportedLanguages[0])
	lang2gettext(lang || supportedLanguages[0]).then(_ => {
		res.locals._ = _
		next()
	})
}
