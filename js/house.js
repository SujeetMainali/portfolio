/*
  Walk-through house. Each section of the portfolio is a room in a real 3D
  model. Click a room (or use the buttons, or the arrow keys) and a character
  walks there through the doorways, and that room's section opens below.

  Three.js loads from a CDN. If it cannot load, or WebGL is unavailable, the
  room buttons and sections still work without the 3D view.
*/

const $ = (sel, scope = document) => scope.querySelector(sel)
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/*===== LAYOUT =====*/
// Rooms are rectangles on the floor (metres). The hall is the front of the house.
const ROOMS = {
  about: { name: 'Study', x0: -6, x1: -2, z0: -4.5, z1: -1.5 },
  skills: { name: 'Living room', x0: -2, x1: 2, z0: -4.5, z1: -1.5 },
  experience: { name: 'Workshop', x0: 2, x1: 6, z0: -4.5, z1: -1.5 },
  projects: { name: 'Gallery', x0: -6, x1: -2, z0: -1.5, z1: 1.5 },
  certifications: { name: 'Library', x0: -2, x1: 2, z0: -1.5, z1: 1.5 },
  contact: { name: 'Porch', x0: 2, x1: 6, z0: -1.5, z1: 1.5 },
  home: { name: 'Entrance hall', x0: -6, x1: 6, z0: 1.5, z1: 4.5 },
}
const ORDER = ['home', 'about', 'skills', 'experience', 'projects', 'certifications', 'contact']

// Doorways. dir 'h' sits on a horizontal wall (constant z), 'v' on a vertical wall (constant x).
const DOORS = [
  { a: 'about', b: 'skills', dir: 'v', x: -2, z: -3 },
  { a: 'skills', b: 'experience', dir: 'v', x: 2, z: -3 },
  { a: 'about', b: 'projects', dir: 'h', x: -4, z: -1.5 },
  { a: 'skills', b: 'certifications', dir: 'h', x: 0, z: -1.5 },
  { a: 'experience', b: 'contact', dir: 'h', x: 4, z: -1.5 },
  { a: 'projects', b: 'certifications', dir: 'v', x: -2, z: 0 },
  { a: 'certifications', b: 'contact', dir: 'v', x: 2, z: 0 },
  { a: 'projects', b: 'home', dir: 'h', x: -4, z: 1.5 },
  { a: 'certifications', b: 'home', dir: 'h', x: 0, z: 1.5 },
  { a: 'contact', b: 'home', dir: 'h', x: 4, z: 1.5 },
  { a: 'home', b: null, dir: 'h', x: 0, z: 4.5 }, // front door
]
const WALL_H = 2.6
const WALL_T = 0.2
const DOOR_W = 1.2

/*===== STATE =====*/
let inHouse = false
let roomIndex = 0
let scene = null // created on first entry, only if Three.js loaded
const $house = $('#house')
const $body = document.body
const $rooms = $$('.room', $('#plan'))
const $walkNow = $('#walk-now')
const $walkPrev = $('#walk-prev')
const $walkNext = $('#walk-next')
const $toggle = $('#house-toggle')

/*===== WALK ROUTE (rooms are connected through doorways) =====*/
function roomCenter(id) {
  const r = ROOMS[id]
  return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }
}

function route(fromId, toId) {
  if (fromId === toId) return []
  const prev = { [fromId]: null }
  const queue = [fromId]
  while (queue.length) {
    const cur = queue.shift()
    for (const d of DOORS) {
      if (d.a !== cur && d.b !== cur) continue
      const next = d.a === cur ? d.b : d.a
      if (!next || next in prev) continue
      prev[next] = { from: cur, door: d }
      queue.push(next)
    }
  }
  if (!(toId in prev)) return []
  const steps = []
  for (let node = toId; node !== fromId; node = prev[node].from) {
    steps.unshift({ room: node, door: prev[node].door })
  }
  const points = []
  for (const s of steps) {
    points.push({ x: s.door.x, z: s.door.z })
    points.push(roomCenter(s.room))
  }
  return points
}

/*===== PUBLIC HOUSE NAVIGATION =====*/
function setRoomIndex(index) {
  roomIndex = Math.max(0, Math.min(ORDER.length - 1, index))
  const id = ORDER[roomIndex]
  $rooms.forEach((room) => room.setAttribute('aria-current', String(room.dataset.room === id)))
  $$('main > section:not(.house)').forEach((s) => s.classList.toggle('is-current', s.id === id))
  $walkNow.textContent = ROOMS[id] ? ROOMS[id].name : id
  $walkPrev.disabled = roomIndex === 0
  $walkNext.disabled = roomIndex === ORDER.length - 1
}

// Walk the character to a room, then open its section.
function walkTo(id, { scroll = true } = {}) {
  const i = ORDER.indexOf(id)
  if (i === -1) return
  const changed = i !== roomIndex
  setRoomIndex(i)
  if (scene) scene.walkTo(id)
  if (scroll && changed) {
    const panel = document.getElementById(id)
    panel.setAttribute('tabindex', '-1')
    panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    panel.focus({ preventScroll: true })
  }
}

function paintToggle() {
  const label = inHouse ? 'Leave the house' : 'Walk through the house'
  $('i', $toggle).className = inHouse ? 'bx bx-log-out' : 'bx bx-home-alt'
  $toggle.setAttribute('aria-label', label)
  $toggle.title = label
}

async function enterHouse(startId = 'home') {
  inHouse = true
  $body.classList.add('is-house')
  $house.hidden = false
  paintToggle()
  if (!scene) scene = await buildScene()
  setRoomIndex(ORDER.indexOf(startId))
  scene && scene.placeAt(startId)
  $house.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  scene && scene.start()
}

function exitHouse() {
  inHouse = false
  $body.classList.remove('is-house')
  $house.hidden = true
  $$('main > section').forEach((s) => s.classList.remove('is-current'))
  scene && scene.stop()
  paintToggle()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

window.houseWalk = {
  active: () => inHouse,
  goTo: (id) => walkTo(id, { scroll: true }),
}

/*===== EVENTS =====*/
$toggle.addEventListener('click', () => (inHouse ? exitHouse() : enterHouse()))
$('#house-start').addEventListener('click', () => enterHouse('home'))
$('#house-exit').addEventListener('click', exitHouse)
$walkPrev.addEventListener('click', () => walkTo(ORDER[roomIndex - 1]))
$walkNext.addEventListener('click', () => walkTo(ORDER[roomIndex + 1]))
$('#plan').addEventListener('click', (e) => {
  const room = e.target.closest('.room')
  if (room) walkTo(room.dataset.room)
})

// In house mode, links to sections walk you to the room instead of scrolling.
document.addEventListener(
  'click',
  (e) => {
    if (!inHouse) return
    const link = e.target.closest('a[href^="#"]')
    if (!link) return
    const id = link.getAttribute('href').slice(1)
    if (!ORDER.includes(id)) return
    e.preventDefault()
    walkTo(id)
  },
  true
)

document.addEventListener('keydown', (e) => {
  if (!inHouse || e.target.closest('input, textarea, select, [contenteditable]')) return
  if (e.key === 'ArrowRight') walkTo(ORDER[roomIndex + 1] || ORDER[roomIndex])
  if (e.key === 'ArrowLeft') walkTo(ORDER[roomIndex - 1] || ORDER[roomIndex])
})

/*===== 3D SCENE =====*/
async function buildScene() {
  let THREE
  try {
    THREE = await import('three')
  } catch (err) {
    return null
  }
  const canvasHost = $('#house-scene')
  if (!canvasHost) return null
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch (err) {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  canvasHost.prepend(renderer.domElement)

  const threeScene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)

  // Colours follow the page theme.
  const palette = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    return dark
      ? { floor: 0x2a2927, active: 0x6b4a33, wall: 0x5a5852, furn: 0x3c3b37, accent: 0xe2934f, wood: 0x6e5a48, plant: 0x4f7a55, skin: 0xd9b48f, rug: 0x4a3a2c, figure: 0xefeee9 }
      : { floor: 0xe9e5dd, active: 0xeccbb0, wall: 0xc9c4b9, furn: 0xb7b1a5, accent: 0xa85a24, wood: 0x9c8064, plant: 0x6f9a74, skin: 0xe2b996, rug: 0xd8c3ad, figure: 0x1c1c1a }
  }
  let pal = palette()
  const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts })
  const materials = { floor: mat(pal.floor), active: mat(pal.active), wall: mat(pal.wall), furn: mat(pal.furn), accent: mat(pal.accent), wood: mat(pal.wood), plant: mat(pal.plant), skin: mat(pal.skin), rug: mat(pal.rug), figure: mat(pal.figure) }

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.2)
  threeScene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffffff, 1.7)
  sun.position.set(8, 18, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 })
  threeScene.add(sun)

  // Ground slab
  const ground = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 10.4), mat(pal.furn))
  ground.position.set(0, -0.16, 0.6)
  ground.receiveShadow = true
  threeScene.add(ground)

  const box = (w, h, d, x, y, z, material, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    m.position.set(x, y, z)
    m.castShadow = cast
    m.receiveShadow = true
    threeScene.add(m)
    return m
  }

  // Floors (one per room, clickable)
  const floors = {}
  for (const id of ORDER) {
    const r = ROOMS[id]
    const plane = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, 0.06, r.z1 - r.z0), materials.floor)
    plane.position.set((r.x0 + r.x1) / 2, 0.03, (r.z0 + r.z1) / 2)
    plane.receiveShadow = true
    plane.userData.room = id
    threeScene.add(plane)
    floors[id] = plane
  }

  // Walls with doorway gaps. Shared walls are built once.
  const seen = new Set()
  const wallPieces = (dir, pos, from, to) => {
    const gaps = DOORS.filter((d) => d.dir === dir && (dir === 'h' ? d.z : d.x) === pos)
      .map((d) => (dir === 'h' ? d.x : d.z))
      .filter((c) => c > from && c < to)
      .sort((p, q) => p - q)
    const pieces = []
    let start = from
    for (const c of gaps) {
      pieces.push([start, c - DOOR_W / 2])
      start = c + DOOR_W / 2
    }
    pieces.push([start, to])
    return pieces.filter(([a, b]) => b - a > 0.05)
  }
  for (const id of ORDER) {
    const r = ROOMS[id]
    const edges = [
      { dir: 'h', pos: r.z0, from: r.x0, to: r.x1 },
      { dir: 'h', pos: r.z1, from: r.x0, to: r.x1 },
      { dir: 'v', pos: r.x0, from: r.z0, to: r.z1 },
      { dir: 'v', pos: r.x1, from: r.z0, to: r.z1 },
    ]
    for (const e of edges) {
      for (const [a, b] of wallPieces(e.dir, e.pos, e.from, e.to)) {
        const key = `${e.dir}:${e.pos}:${a.toFixed(2)}:${b.toFixed(2)}`
        if (seen.has(key)) continue
        seen.add(key)
        if (e.dir === 'h') box(b - a, WALL_H, WALL_T, (a + b) / 2, WALL_H / 2, e.pos, materials.wall)
        else box(WALL_T, WALL_H, b - a, e.pos, WALL_H / 2, (a + b) / 2, materials.wall)
      }
    }
  }

  // Furniture, placed by room
  const c = (id) => roomCenter(id)
  // Study: desk, monitor, chair
  const s = c('about')
  box(1.8, 0.08, 0.8, s.x, 0.74, s.z - 0.6, materials.wood)
  box(0.9, 0.5, 0.05, s.x, 1.1, s.z - 0.95, materials.furn)
  box(0.5, 0.1, 0.5, s.x, 0.45, s.z + 0.5, materials.furn)
  // Living room: sofa against the back wall, coffee table
  const l = c('skills')
  box(2.2, 0.45, 0.9, l.x, 0.23, -4.0, materials.accent)
  box(2.2, 0.55, 0.22, l.x, 0.6, -4.3, materials.accent)
  box(1.2, 0.08, 0.6, l.x, 0.38, -2.7, materials.wood)
  // Workshop: workbench and crates
  const w = c('experience')
  box(3.0, 0.9, 0.8, w.x, 0.45, -3.9, materials.wood)
  box(0.7, 0.6, 0.7, w.x + 1.6, 0.3, -2.4, materials.wood)
  box(0.7, 0.6, 0.7, w.x + 0.8, 0.3, -2.4, materials.furn)
  // Gallery: six framed works on the left wall
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.65), materials.accent)
      frame.position.set(-5.85, 1.0 + row * 0.8, -0.9 + col * 0.9)
      frame.castShadow = true
      threeScene.add(frame)
    }
  }
  // Library: two shelves on the back wall (clear of the doorway), reading table
  const lb = c('certifications')
  box(1.2, 2.0, 0.4, lb.x - 1.4, 1.0, -1.3, materials.wood)
  box(1.2, 2.0, 0.4, lb.x + 1.4, 1.0, -1.3, materials.wood)
  box(1.0, 0.75, 0.6, lb.x, 0.37, 0.4, materials.wood)
  // Porch: bench and plant
  const p = c('contact')
  box(1.6, 0.45, 0.5, p.x, 0.22, 0.4, materials.wood)
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.6, 16), materials.furn)
  pot.position.set(5.2, 0.3, -0.6)
  pot.castShadow = true
  threeScene.add(pot)
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), materials.plant)
  leaves.position.set(5.2, 0.9, -0.6)
  leaves.castShadow = true
  threeScene.add(leaves)
  // Hall: rug and welcome mat
  box(4.5, 0.02, 2.4, 0, 0.07, 3.0, materials.rug, false)

  // Character
  const figure = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.75, 16), materials.figure)
  body.position.y = 0.85
  body.castShadow = true
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), materials.skin)
  head.position.y = 1.5
  head.castShadow = true
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.14), materials.figure)
  const legR = legL.clone()
  legL.position.set(-0.1, 0.25, 0)
  legR.position.set(0.1, 0.25, 0)
  figure.add(body, head, legL, legR)
  threeScene.add(figure)

  // Path state
  let pos = { x: 0, z: 0 }
  let path = []
  let walkTime = 0
  let walking = false

  // Camera (drag to orbit, wheel to zoom)
  const cam = { theta: 0.6, phi: 0.95, r: 23, target: new THREE.Vector3(0, 0.5, 0.6) }
  const updateCamera = () => {
    const x = cam.r * Math.sin(cam.phi) * Math.sin(cam.theta)
    const y = cam.r * Math.cos(cam.phi)
    const z = cam.r * Math.sin(cam.phi) * Math.cos(cam.theta)
    camera.position.set(cam.target.x + x, cam.target.y + y, cam.target.z + z)
    camera.lookAt(cam.target)
  }

  const resize = () => {
    const w = canvasHost.clientWidth
    const h = canvasHost.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvasHost)

  let drag = null
  const dom = renderer.domElement
  dom.style.touchAction = 'none'
  dom.style.cursor = 'grab'
  dom.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 }
    dom.setPointerCapture(e.pointerId)
  })
  dom.addEventListener('pointermove', (e) => {
    if (!drag) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    drag.moved += Math.abs(dx) + Math.abs(dy)
    drag.x = e.clientX
    drag.y = e.clientY
    cam.theta -= dx * 0.008
    cam.phi = Math.min(1.3, Math.max(0.35, cam.phi - dy * 0.005))
  })
  dom.addEventListener('pointerup', (e) => {
    if (drag && drag.moved < 6) {
      const rect = dom.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(Object.values(floors))[0]
      if (hit) walkTo(hit.object.userData.room)
    }
    drag = null
  })
  dom.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      cam.r = Math.min(30, Math.max(11, cam.r + e.deltaY * 0.01))
    },
    { passive: false }
  )
  dom.addEventListener('pointermove', (e) => {
    if (drag) return
    const rect = dom.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, camera)
    dom.style.cursor = ray.intersectObjects(Object.values(floors))[0] ? 'pointer' : 'grab'
  })

  // Room labels, projected from 3D each frame
  const labelHost = $('#house-labels')
  const labels = {}
  for (const id of ORDER) {
    const el = document.createElement('span')
    el.className = 'house-label'
    el.textContent = ROOMS[id].name
    labelHost.appendChild(el)
    labels[id] = el
  }

  const placeAt = (id) => {
    const cc = roomCenter(id)
    pos = { x: cc.x, z: cc.z }
    path = []
    walking = false
    figure.position.set(pos.x, 0, pos.z)
    cam.target.set(pos.x, 0.5, pos.z)
    setActive(id)
  }

  const walkToRoom = (id) => {
    const from = nearestRoom()
    path = route(from, id)
    walking = path.length > 0
    if (!walking) setActive(id)
    walkTime = 0
    activeId = id
    setActive(id)
  }

  let activeId = 'home'
  const setActive = (id) => {
    activeId = id
    for (const key of ORDER) floors[key].material = key === id ? materials.active : materials.floor
  }

  const nearestRoom = () => {
    let best = ORDER[0]
    let bestD = Infinity
    for (const id of ORDER) {
      const cc = roomCenter(id)
      const d = (cc.x - pos.x) ** 2 + (cc.z - pos.z) ** 2
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    return best
  }

  let raf = 0
  let last = performance.now()
  let running = false
  const frame = (now) => {
    if (!running) return
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (walking && path.length) {
      const target = path[0]
      const dx = target.x - pos.x
      const dz = target.z - pos.z
      const dist = Math.hypot(dx, dz)
      const speed = reduceMotion ? 12 : 3.2
      const step = speed * dt
      if (dist <= step) {
        pos.x = target.x
        pos.z = target.z
        path.shift()
        if (!path.length) walking = false
      } else {
        pos.x += (dx / dist) * step
        pos.z += (dz / dist) * step
        figure.rotation.y = Math.atan2(dx, dz)
      }
      walkTime += dt * 10
      legL.rotation.x = Math.sin(walkTime) * 0.6
      legR.rotation.x = -Math.sin(walkTime) * 0.6
      if (!walking) legL.rotation.x = legR.rotation.x = 0
    }
    figure.position.set(pos.x, 0, pos.z)
    // the camera follows the character a little
    cam.target.x += (pos.x - cam.target.x) * Math.min(1, dt * 2)
    cam.target.z += (pos.z - cam.target.z) * Math.min(1, dt * 2)
    updateCamera()

    renderer.render(threeScene, camera)
    const w = canvasHost.clientWidth
    const h = canvasHost.clientHeight
    for (const id of ORDER) {
      const cc = roomCenter(id)
      const v = new THREE.Vector3(cc.x, 0.2, cc.z).project(camera)
      const el = labels[id]
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`
      el.classList.toggle('is-active', id === activeId)
    }
    raf = requestAnimationFrame(frame)
  }

  // Theme follows the page
  new MutationObserver(() => {
    pal = palette()
    materials.floor.color.setHex(pal.floor)
    materials.active.color.setHex(pal.active)
    materials.wall.color.setHex(pal.wall)
    materials.furn.color.setHex(pal.furn)
    materials.accent.color.setHex(pal.accent)
    materials.wood.color.setHex(pal.wood)
    materials.plant.color.setHex(pal.plant)
    materials.skin.color.setHex(pal.skin)
    materials.rug.color.setHex(pal.rug)
    materials.figure.color.setHex(pal.figure)
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  resize()
  updateCamera()

  return {
    placeAt,
    walkTo: walkToRoom,
    start() {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
  }
}

setRoomIndex(0)
paintToggle()
