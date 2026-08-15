/**
 * This is a global object where all State related variable are stored.
 * Allows to be accessed and changed from anywhere.
 */

let state = {
    'play' : true,
    'inTravel' : false,
    'inTransition' : false,
    'focused' : null,
    'selected' : null,
    'old' : null,
    'distance' : 0,
}

export {state as STATE} 