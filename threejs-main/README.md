# Solar System — React Three Fiber

Visualisation interactive du système solaire, construite avec React, React Three Fiber et Drei.

## Commandes

```bash
npm install
npm run dev
npm run build
```

## Organisation

- `src/data/celestialBodies.js` : données et paramètres calculés des astres.
- `src/components/CelestialBody.jsx` : surfaces, atmosphères, anneaux, labels et orbites.
- `src/components/CameraRig.jsx` : suivi des astres et transitions de caméra.
- src/components/ControlPanel.jsx : panneau interactif des réglages de simulation.
- src/config/systemSettings.js : valeurs par défaut du panneau.
- `src/components/SceneEnvironment.jsx` : éclairage, arrière-plan et configuration des textures.
- `src/SolarSystem.jsx` : composition déclarative de la scène.
- `public/textures` : textures chargées par Three.js.
- `legacy-threejs` : ancienne implémentation Three.js native, conservée comme référence.