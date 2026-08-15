//-------------- Easing functions ------------------

/**
 * Ease-in ease out function, with an "elastic" twist
 * @param {Number} x 
 * @returns 
 */
export function easeInOutBack(x){
    const c1 = 1.70158
    const c2 = c1 * 1.525

    return x < 0.5
    ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2
}


export function easeInOutCubic(x) {
    return x < 0.5 
    ? 4 * x * x * x 
    : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function quadratic(x){
    return Maths.pow(x, 2)
}

export function easeInSine(x) {
    return 1 - Math.cos((x * Math.PI) / 2);
  }

export function easeOutSine(x) {
    return Math.sin((x * Math.PI) / 2);
  }