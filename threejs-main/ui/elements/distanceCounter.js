import Element from "../../classes/Element"
import { isTravelling } from "./isTraveling"

const classes = []
const distanceCounter = new Element('div', 'distance-counter', classes)
const name = new Element('p','counter-target-name')
const counter = new Element('p', 'counter-value')
name.innerHTML = '' 
counter.innerHTML = ' ' 
distanceCounter.appendChild(isTravelling)
distanceCounter.appendChild(name)
distanceCounter.appendChild(counter)


export {distanceCounter}

