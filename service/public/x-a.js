class XA extends HTMLAnchorElement {
	static observedAttributes = ['method']
	connectedCallback() {
		this.addEventListener('click', e => {
			e.preventDefault()
			const method = this.getAttribute('method')
			fetch(this.href, { method }).then(res => {
				if (res.ok) {
					location.reload()
				} else {
					alert('Something went wrong.')
				}
			})
		})
	}
}

customElements.define('extended-anchor', XA, {
	extends: 'a'
})
