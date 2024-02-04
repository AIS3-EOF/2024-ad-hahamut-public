const { faker } = require('@faker-js/faker')

exports.choice = ar => ar[Math.floor(Math.random() * ar.length)]
exports.choiceMultiple = (ar, n) => {
	ar = ar.slice()
	for (let i = 0; i < ar.length; i++) {
		const j = Math.floor(Math.random() * ar.length)
		const tmp = ar[i]
		ar[i] = ar[j]
		ar[j] = tmp
	}
	return ar.slice(0, n)
}
exports.genStr = (fn, { min = 1, max = 20 } = {}) => {
	while (true) {
		const str = fn()
		if (str.length >= min && str.length <= max) return str
	}
}
exports.fakeFlag = () => 'EOF' + faker.string.alphanumeric(29)
