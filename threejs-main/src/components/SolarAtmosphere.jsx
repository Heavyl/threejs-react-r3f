import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const INNER_LAYER_SCALE = 1.05
const OUTER_LAYER_SCALE = 1.05

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSpeed;
  uniform float uRimStrength;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  void main() {
    float latitudeFlow = sin(vUv.y * 18.0 + uTime * 0.11) * 0.004;
    vec2 firstUv = fract(vUv + vec2(uTime * uSpeed + latitudeFlow, 0.0));
    vec2 secondUv = fract(vUv + vec2(-uTime * uSpeed * 0.47, uTime * uSpeed * 0.16));

    vec3 firstSample = texture2D(uMap, firstUv).rgb;
    vec3 secondSample = texture2D(uMap, secondUv).rgb;
    vec3 animatedColor = mix(firstSample, secondSample, 0.28);

    #if MOBILE_QUALITY == 0
      vec2 detailUv = fract(vUv + vec2(uTime * uSpeed * 0.21, -uTime * uSpeed * 0.09));
      animatedColor = mix(animatedColor, texture2D(uMap, detailUv).rgb, 0.12);
    #endif

    // A few discrete values retain the cut-paper look of the source texture.
    animatedColor = floor(animatedColor * 7.0 + 0.5) / 7.0;

    float rim = pow(
      1.0 - abs(dot(normalize(vViewNormal), normalize(vViewDirection))),
      2.15
    );
    float luminance = dot(animatedColor, vec3(0.2126, 0.7152, 0.0722));
    float textureOpacity = mix(0.58, 1.0, smoothstep(0.12, 0.82, luminance));
    float alpha = uOpacity * mix(1.0, textureOpacity * rim, uRimStrength);

    if (alpha <= 0.002) discard;

    gl_FragColor = vec4(animatedColor, alpha);
    #include <colorspace_fragment>
  }
`

function createLayerMaterial(texture, mobilePerformance, opacity, speed, rimStrength) {
  return new THREE.ShaderMaterial({
    defines: {
      MOBILE_QUALITY: mobilePerformance ? 1 : 0,
    },
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uSpeed: { value: speed },
      uRimStrength: { value: rimStrength },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
  })
}

export default function SolarAtmosphere({
  radius,
  texture,
  mobilePerformance,
  timeScale,
}) {
  const elapsed = useRef(0)
  const innerRef = useRef()
  const outerRef = useRef()
  const segments = mobilePerformance ? 32 : 64

  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, segments, segments),
    [radius, segments],
  )
  const innerMaterial = useMemo(
    () => createLayerMaterial(texture, mobilePerformance, 1, 0.006, 0),
    [mobilePerformance, texture],
  )
  const outerMaterial = useMemo(
    () => createLayerMaterial(texture, mobilePerformance, 1, -0.0035, 0.82),
    [mobilePerformance, texture],
  )

  useFrame((_, delta) => {
    if (timeScale > 0) elapsed.current += delta

    const time = elapsed.current
    innerMaterial.uniforms.uTime.value = time
    outerMaterial.uniforms.uTime.value = time

    if (innerRef.current) innerRef.current.rotation.y = time * 0.012
    if (outerRef.current) {
      outerRef.current.rotation.y = -time * 0.007
      outerRef.current.scale.setScalar(
        OUTER_LAYER_SCALE + Math.sin(time * 0.42) * 0.006,
      )
    }
  })

  useEffect(() => () => {
    geometry.dispose()
    innerMaterial.dispose()
    outerMaterial.dispose()
  }, [geometry, innerMaterial, outerMaterial])

  return (
    <group>
      <mesh
        ref={innerRef}
        geometry={geometry}
        material={innerMaterial}
        scale={INNER_LAYER_SCALE}
        renderOrder={1}
      />
      <mesh
        ref={outerRef}
        geometry={geometry}
        material={outerMaterial}
        scale={OUTER_LAYER_SCALE}
        renderOrder={0}
      />
    </group>
  )
}
