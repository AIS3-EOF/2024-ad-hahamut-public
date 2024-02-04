import { marked } from 'https://esm.run/marked'

class MdText extends HTMLElement {
	connectedCallback() {
		this.innerHTML = marked(this.textContent)
	}
}

customElements.define('md-text', MdText)
