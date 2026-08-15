import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const SCALE = 1 / 10000
const AU = 149597870.7
const SUN_RADIUS = 696342 * SCALE
const axis = new THREE.Vector3(0, 0, 1)
const temp = new THREE.Vector3()

const bodies = [
  { name: 'Sun', radius: 696342, texture: 'sun', rotation: 2.0, emissive: true },
  { name: 'Mercury', radius: 2439, texture: 'mercury', orbit: .4, speed: 47.362, tilt: 7, axialTilt: .035, rotation: .003 },
  { name: 'Venus', radius: 6051, texture: 'venus', orbit: .723, speed: 35.025, tilt: 3.4, axialTilt: 177.3, rotation: .0018, atmosphere: 'venus' },
  { name: 'Earth', radius: 6371, texture: 'earth', orbit: 1, speed: 29.72, tilt: 0, axialTilt: 23.5, rotation: .465, atmosphere: 'earth' },
  { name: 'Moon', radius: 1737, texture: 'moon', parent: 'Earth', orbitKm: .0025 * AU, speed: 10.02, tilt: 5.68, axialTilt: 6.68 },
  { name: 'Mars', radius: 3389, texture: 'mars', orbit: 1.523, speed: 24.13, tilt: 1.85, axialTilt: 25.2, rotation: .24, atmosphere: 'mars' },
  { name: 'Deimos', radius: 15, parent: 'Mars', orbitKm: .00015 * AU, speed: 1.35, tilt: 27.58 },
  { name: 'Phobos', radius: 25.9, parent: 'Mars', orbitKm: .0000626 * AU, speed: 2.138, tilt: 26.04 },
  { name: 'Jupiter', radius: 71492, texture: 'jupiter', orbit: 5.202, speed: 13.058, tilt: 1.304, axialTilt: 3.12, rotation: 13.06 },
  { name: 'Saturn', radius: 58232, texture: 'saturn', orbit: 9.5, speed: 9.6725, tilt: 2.485, axialTilt: 26.73, rotation: 9.68, rings: true },
  { name: 'Uranus', radius: 25362, texture: 'uranus', orbit: 19.189, speed: 6.835, tilt: .773, axialTilt: 97.8, rotation: 2.59 },
  { name: 'Neptune', radius: 24622, texture: 'neptune', orbit: 30.069, speed: 5.43, tilt: 1.304, axialTilt: 28.32, rotation: 2.68 },
]

const texturePaths = {
  stars: '/textures/8k_stars_milky_way.jpg', sun: '/textures/sun/sunColor.jpg', mercury: '/textures/mercury/mercuryColor.jpg',
  venus: '/textures/venus/venusColor.jpg', venusClouds: '/textures/venus/venusClouds.jpg', earth: '/textures/earth/earthColor.jpg',
  earthClouds: '/textures/earth/earthClouds2.jpg', earthNormal: '/textures/earth/earthNormal2.jpg', moon: '/textures/moon/moonColor.jpg',
  mars: '/textures/mars/marsColor.jpg', jupiter: '/textures/jupiter/jupiterColor.jpg', saturn: '/textures/saturn/saturnColor.jpg',
  saturnRings: '/textures/saturn/saturnRings.png', uranus: '/textures/uranus/uranusColor.jpg', neptune: '/textures/neptune/neptuneColor.jpg',
}

function displayRadius(body) {
  return Math.max(body.radius * SCALE, body.parent ? .13 : .22)
}

function orbitRadius(body) {
  return body.parent ? ((bodies.find((item) => item.name === body.parent).radius + body.orbitKm / 10) * SCALE) : SUN_RADIUS + (body.orbit * AU / 10) * SCALE
}

function placeOnOrbit(body, elapsed, parentPosition) {
  if (!body.orbit && !body.parent) return temp.set(0, 0, 0)
  const angle = elapsed * body.speed * SCALE + (body.name.length * .71)
  temp.set(Math.cos(angle) * orbitRadius(body), 0, Math.sin(angle) * orbitRadius(body))
  temp.applyAxisAngle(axis, THREE.MathUtils.degToRad(body.tilt || 0))
  return parentPosition ? temp.add(parentPosition) : temp
}

function Background({ texture }) {
  return (
    <mesh scale={12000}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}

function OrbitLine({ body, references }) {
  const line = useMemo(() => {
    const points = []
    const radius = orbitRadius(body)
    for (let index = 0; index <= 128; index += 1) {
      const angle = (index / 128) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [body])
  const ref = useRef()

  useFrame(() => {
    if (body.parent && references.current[body.parent]) ref.current.position.copy(references.current[body.parent].position)
  })

  useEffect(() => () => line.dispose(), [line])
  return <line ref={ref} rotation={[0, 0, THREE.MathUtils.degToRad(body.tilt || 0)]} geometry={line}><lineBasicMaterial color="#ffffff" transparent opacity={.12} /></line>
}

function Atmosphere({ type, textures, radius }) {
  if (type === 'earth') return <>
    <mesh scale={1.035}><sphereGeometry args={[radius, 48, 48]} /><meshBasicMaterial color="#3d7dff" transparent opacity={.18} side={THREE.BackSide} depthWrite={false} /></mesh>
    <mesh scale={1.014}><sphereGeometry args={[radius, 48, 48]} /><meshStandardMaterial alphaMap={textures.earthClouds} transparent opacity={.28} depthWrite={false} /></mesh>
  </>
  if (type === 'venus') return <mesh scale={1.03}><sphereGeometry args={[radius, 48, 48]} /><meshStandardMaterial map={textures.venusClouds} transparent opacity={.22} depthWrite={false} /></mesh>
  return <mesh scale={1.025}><sphereGeometry args={[radius, 48, 48]} /><meshBasicMaterial color="#dd6c30" transparent opacity={.17} side={THREE.BackSide} depthWrite={false} /></mesh>
}

function SaturnRings({ texture, bodyRadius }) {
  return <mesh rotation={[Math.PI / 2, 0, 0]}>
    <ringGeometry args={[bodyRadius * 1.25, bodyRadius * 2.35, 192]} />
    <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent opacity={.9} roughness={.65} />
  </mesh>
}

function CelestialBody({ body, textures, references, onFocus }) {
  const group = useRef()
  const surface = useRef()
  const radius = displayRadius(body)

  useEffect(() => {
    references.current[body.name] = group.current
    return () => { delete references.current[body.name] }
  }, [body.name, references])

  useFrame(({ clock }) => {
    const parent = body.parent ? references.current[body.parent] : null
    group.current.position.copy(placeOnOrbit(body, clock.getElapsedTime(), parent?.position))
    if (surface.current && body.rotation) surface.current.rotation.y += body.rotation * SCALE * 1.5
  })

  const select = (event) => {
    event.stopPropagation()
    onFocus(body.name)
  }

  return <group ref={group}>
    <group ref={surface} rotation={[0, 0, THREE.MathUtils.degToRad(body.axialTilt || 0)]}>
      <mesh castShadow receiveShadow onClick={select}>
        <sphereGeometry args={[radius, body.name === 'Sun' ? 96 : 64, body.name === 'Sun' ? 96 : 64]} />
        {body.emissive
          ? <meshStandardMaterial map={textures[body.texture]} emissive="#ffb11b" emissiveMap={textures[body.texture]} emissiveIntensity={1.15} />
          : <meshStandardMaterial map={textures[body.texture]} normalMap={body.name === 'Earth' ? textures.earthNormal : undefined} roughness={.82} metalness={0} />}
      </mesh>
      {body.atmosphere && <Atmosphere type={body.atmosphere} textures={textures} radius={radius} />}
      {body.rings && <SaturnRings texture={textures.saturnRings} bodyRadius={radius} />}
    </group>
    <Html center position={[0, radius + Math.max(.45, radius * .13), 0]} distanceFactor={25}>
      <button className="planet-label" type="button" onPointerDown={select}>𐤏 {body.name}</button>
    </Html>
  </group>
}

function CameraController({ focusedBody, references, onTravellingChange, controls }) {
  const { camera } = useThree()
  const initialized = useRef(false)
  const previousFocus = useRef(focusedBody)
  const lastTarget = useRef(new THREE.Vector3())
  const transition = useRef(null)
  const travelling = useRef(false)

  const setTravelling = (value) => {
    if (travelling.current !== value) {
      travelling.current = value
      onTravellingChange(value)
    }
  }

  useFrame(({ clock }) => {
    const targetObject = references.current[focusedBody]
    if (!targetObject || !controls.current) return
    const target = targetObject.position
    const body = bodies.find((item) => item.name === focusedBody)
    const distance = Math.max(displayRadius(body) * 4.5, 3)

    if (!initialized.current) {
      camera.position.copy(target).add(new THREE.Vector3(distance, distance * .55, distance))
      controls.current.target.copy(target)
      lastTarget.current.copy(target)
      initialized.current = true
      return
    }

    if (previousFocus.current !== focusedBody) {
      previousFocus.current = focusedBody
      transition.current = { started: clock.getElapsedTime(), from: camera.position.clone() }
      setTravelling(true)
    }

    if (transition.current) {
      const progress = Math.min((clock.getElapsedTime() - transition.current.started) / 1.35, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const destination = target.clone().add(new THREE.Vector3(distance, distance * .55, distance))
      camera.position.lerpVectors(transition.current.from, destination, eased)
      controls.current.target.lerp(target, .16)
      if (progress === 1) {
        transition.current = null
        setTravelling(false)
      }
    } else {
      camera.position.add(target.clone().sub(lastTarget.current))
      controls.current.target.lerp(target, .18)
    }
    lastTarget.current.copy(target)
  })
  return null
}

export default function SolarSystem({ focusedBody, onFocus, onTravellingChange }) {
  const textures = useTexture(texturePaths)
  const references = useRef({})
  const controls = useRef()

  useEffect(() => {
    Object.values(textures).forEach((texture) => { texture.colorSpace = THREE.SRGBColorSpace })
    textures.saturnRings.wrapS = textures.saturnRings.wrapT = THREE.RepeatWrapping
  }, [textures])

  return <>
    <color attach="background" args={['#000000']} />
    <Background texture={textures.stars} />
    <Stars radius={11000} depth={2000} count={4000} factor={4} saturation={0} fade speed={.2} />
    <ambientLight intensity={.08} />
    <pointLight position={[0, 0, 0]} intensity={6} distance={10000} decay={1.1} />
    {bodies.filter((body) => body.orbit || body.parent).map((body) => <OrbitLine key={`${body.name}-orbit`} body={body} references={references} />)}
    {bodies.map((body) => <CelestialBody key={body.name} body={body} textures={textures} references={references} onFocus={onFocus} />)}
    <OrbitControls ref={controls} enableDamping dampingFactor={.06} enablePan={false} minDistance={.25} maxDistance={16000} />
    <CameraController focusedBody={focusedBody} references={references} onTravellingChange={onTravellingChange} controls={controls} />
  </>
}