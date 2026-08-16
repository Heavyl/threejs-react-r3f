import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { getTravelMetricsSnapshot, subscribeToTravelMetrics } from '../data/travelMetricsStore'

const DISTORTION_STRENGTH = 1.58
const DISTORTION_DAMPING = 12

const travelDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float radius = length(centered);
      float radiusSquared = dot(centered, centered);

      // The center remains fixed while distortion grows toward the edges.
      vec2 warpedUv = 0.5 + centered * (1.0 - intensity * radiusSquared);
      vec2 radialDirection = centered / max(radius, 0.0001);
      vec2 streak = radialDirection * radiusSquared * intensity * 0.018;

      #if MOBILE_QUALITY == 1
        vec3 sharpColor = texture2D(tDiffuse, warpedUv).rgb;
        vec3 radialBlur = mix(sharpColor, texture2D(tDiffuse, warpedUv - streak * 0.7).rgb, 0.42);
      #else
        vec3 sharpColor;
        float chromaticOffset = radiusSquared * intensity * 0.012;
        sharpColor.r = texture2D(tDiffuse, warpedUv + radialDirection * chromaticOffset).r;
        sharpColor.g = texture2D(tDiffuse, warpedUv).g;
        sharpColor.b = texture2D(tDiffuse, warpedUv - radialDirection * chromaticOffset).b;
        vec3 radialBlur = texture2D(tDiffuse, warpedUv).rgb * 0.34;
        radialBlur += texture2D(tDiffuse, warpedUv - streak * 0.35).rgb * 0.26;
        radialBlur += texture2D(tDiffuse, warpedUv - streak * 0.7).rgb * 0.22;
        radialBlur += texture2D(tDiffuse, warpedUv - streak).rgb * 0.18;
      #endif

      float peripheralMask = smoothstep(0.08, 0.62, radius) * intensity;
      vec3 color = mix(sharpColor, radialBlur, peripheralMask * 0.78);
      float vignette = 1.0 - smoothstep(0.38, 0.78, radius) * intensity * 0.34;

      gl_FragColor = vec4(color * vignette, 1.0);
    }
  `,
}

export default function TravelDistortion({ mobilePerformance }) {
  const { camera, gl, scene, size } = useThree()
  const intensity = useRef(0)
  const metrics = useSyncExternalStore(
    subscribeToTravelMetrics,
    getTravelMetricsSnapshot,
    getTravelMetricsSnapshot,
  )

  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl)
    composer.setPixelRatio(mobilePerformance ? 0.75 : Math.min(gl.getPixelRatio(), 1.5))
    composer.renderTarget1.samples = mobilePerformance ? 1 : 2
    composer.renderTarget2.samples = mobilePerformance ? 1 : 2

    const renderPass = new RenderPass(scene, camera)
    const distortionPass = new ShaderPass(travelDistortionShader)
    distortionPass.material.defines = { ...distortionPass.material.defines, MOBILE_QUALITY: mobilePerformance ? 1 : 0 }
    distortionPass.material.needsUpdate = true
    const outputPass = new OutputPass()
    composer.addPass(renderPass)
    composer.addPass(distortionPass)
    composer.addPass(outputPass)

    return { composer, distortionPass, outputPass }
  }, [camera, gl, mobilePerformance, scene])

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height)
  }, [pipeline, size.height, size.width])

  useEffect(() => () => {
    pipeline.distortionPass.material.dispose()
    pipeline.outputPass.dispose()
    pipeline.composer.dispose()
  }, [pipeline])

  useFrame((_, delta) => {
    const targetIntensity = metrics.visualIntensity * DISTORTION_STRENGTH
    intensity.current = THREE.MathUtils.damp(
      intensity.current,
      targetIntensity,
      DISTORTION_DAMPING,
      delta,
    )
    pipeline.distortionPass.uniforms.intensity.value = intensity.current
    if (targetIntensity < 0.001 && intensity.current < 0.001) {
      gl.setRenderTarget(null)
      gl.render(scene, camera)
      return
    }
    pipeline.composer.render(delta)
  }, 1)

  return null
}

