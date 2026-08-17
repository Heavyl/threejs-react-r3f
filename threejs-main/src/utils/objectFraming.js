import * as THREE from 'three'

const EPSILON = 1e-12
const DEFAULT_VIEWPORT_FILL = 0.72

function isIncludedMesh(object, root) {
  if (!object.isMesh || !object.geometry) return false

  let current = object
  while (current) {
    if (!current.visible || current.userData.excludeFromCameraFraming) return false
    if (current === root) return true
    current = current.parent
  }

  return false
}

export function createObjectFramingState() {
  return {
    object: null,
    valid: false,
    localCenter: new THREE.Vector3(),
    localRadius: 0,
    center: new THREE.Vector3(),
    radius: 0,
    distance: 0,
    bounds: new THREE.Box3(),
    childBounds: new THREE.Box3(),
    sphere: new THREE.Sphere(),
    rootInverse: new THREE.Matrix4(),
    relativeMatrix: new THREE.Matrix4(),
    worldScale: new THREE.Vector3(),
  }
}

function measureLocalBounds(object, state) {
  object.updateWorldMatrix(true, true)
  state.bounds.makeEmpty()
  state.rootInverse.copy(object.matrixWorld).invert()

  object.traverse((child) => {
    if (!isIncludedMesh(child, object)) return

    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
    if (!child.geometry.boundingBox || child.geometry.boundingBox.isEmpty()) return

    state.relativeMatrix.multiplyMatrices(state.rootInverse, child.matrixWorld)
    state.childBounds
      .copy(child.geometry.boundingBox)
      .applyMatrix4(state.relativeMatrix)
    state.bounds.union(state.childBounds)
  })

  state.object = object
  state.valid = !state.bounds.isEmpty()
  if (!state.valid) {
    state.localCenter.set(0, 0, 0)
    state.localRadius = 0
    return
  }

  state.bounds.getBoundingSphere(state.sphere)
  state.localCenter.copy(state.sphere.center)
  state.localRadius = state.sphere.radius
}

export function updateObjectFraming(
  object,
  camera,
  state,
  {
    viewportFill = DEFAULT_VIEWPORT_FILL,
    fallbackDistance = camera.near * 12,
    nearPlaneMargin = 2,
  } = {},
) {
  if (state.object !== object || !state.valid) measureLocalBounds(object, state)

  object.updateWorldMatrix(true, true)
  state.center.copy(state.localCenter).applyMatrix4(object.matrixWorld)

  if (!state.valid || state.localRadius <= EPSILON) {
    state.radius = 0
    state.distance = Math.max(fallbackDistance, camera.near * nearPlaneMargin)
    return state
  }

  object.getWorldScale(state.worldScale)
  state.radius = state.localRadius * Math.max(
    Math.abs(state.worldScale.x),
    Math.abs(state.worldScale.y),
    Math.abs(state.worldScale.z),
  )

  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) * 0.5
  const horizontalHalfFov = Math.atan(
    Math.tan(verticalHalfFov) * Math.max(camera.aspect, EPSILON),
  )
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov)
  const safeViewportFill = THREE.MathUtils.clamp(viewportFill, 0.05, 0.95)
  const framedHalfAngle = Math.atan(
    Math.tan(limitingHalfFov) * safeViewportFill,
  )
  const fitDistance = state.radius / Math.max(Math.sin(framedHalfAngle), EPSILON)
  const clippingDistance = state.radius + camera.near * nearPlaneMargin

  state.distance = Math.max(fitDistance, clippingDistance)
  return state
}
