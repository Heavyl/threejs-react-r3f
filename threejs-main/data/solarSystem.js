import { earth, moon } from "../objects/planets/earth"
import { jupiter } from "../objects/planets/jupiter"
import { deimos, mars, phobos } from "../objects/planets/mars"
import { mercury } from "../objects/planets/mercury"
import { neptune } from "../objects/planets/neptune"
import { saturn } from "../objects/planets/saturn"
import { uranus } from "../objects/planets/uranus"
import { venus } from "../objects/planets/venus"
import { sun } from "../objects/stars/sun"


const solarSystemObject = {
    'sun' : sun,
    'Mercury' : mercury,
    'Venus' : venus,
    'Earth' : earth,
    'Moon': moon,
    'Mars' : mars,
    'Deimos' : deimos,
    'Phobos' : phobos,
    'Jupiter' : jupiter,
    'Saturn' : saturn,
    'uranus' : uranus,
    'neptune' : neptune,
}

export {solarSystemObject}
