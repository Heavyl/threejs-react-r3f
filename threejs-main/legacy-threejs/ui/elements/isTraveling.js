import Element from "../../classes/Element"

const classes = []
const isTravelling = new Element('div', 'is-travelling', classes)
const text = new Element('p')
text.innerHTML = 'Travelling to ...'

isTravelling.appendChild(text)

export {isTravelling}