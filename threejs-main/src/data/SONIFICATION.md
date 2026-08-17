# Global sonification melody

`sonificationMelody.json` modulates every oscillator in the active planetary
sonification by the same amount. The physical fundamental and harmonic ratios
therefore remain the basis of the sound.

Each step accepts exactly one pitch instruction:

- `semitones`: relative musical transposition (`12` = one octave).
- `frequencyRatio`: multiplier relative to the physical fundamental (`1.5` = a perfect fifth).
- `frequencyHz`: absolute target for the fundamental.

Timing is expressed with:

- `durationSeconds`: total duration of the step.
- `transitionSeconds`: portion of that duration used to glide from the previous pitch.

The score can be disabled with `"enabled": false` and repeated with
`"loop": true`. When looping, the final step glides back into the first one.
