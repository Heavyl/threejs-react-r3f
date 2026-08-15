import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'
import SolarSystem from './SolarSystem'

export default function App() {
  const [focusedBody, setFocusedBody] = useState('Earth')
  const [travelling, setTravelling] = useState(false)

  return (
    <main className="app-shell">
      <Canvas camera={{ fov: 55, near: 0.01, far: 25000 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <SolarSystem focusedBody={focusedBody} onFocus={setFocusedBody} onTravellingChange={setTravelling} />
        </Suspense>
      </Canvas>
      <section className="hud" aria-live="polite">
        {travelling && <p className="travelling">Navigation vers…</p>}
        <h1>{focusedBody}</h1>
        <p>Cliquez sur une planète ou son libellé pour vous y rendre.</p>
      </section>
    </main>
  )
}