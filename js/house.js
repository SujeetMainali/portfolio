/*
  A walk-through museum of the portfolio.

  You walk through the house from the inside (WASD or arrow keys, drag to
  look, click the floor to walk). Each room holds pieces you can walk up to:
  project frames, skill plinths, job plaques, certificates, the contact
  mailbox. Opening a piece shows its details in a panel inside the scene,
  taken straight from the section on the page.

  Three.js loads from a CDN. If it cannot load, or WebGL is unavailable, the
  house is skipped and the page's sections are shown instead.
*/

const $ = (sel, scope = document) => scope.querySelector(sel)
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/*===== LAYOUT (metres) =====*/
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

// Doorways. 'h' sits on a wall of constant z, 'v' on a wall of constant x.
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
const EYE = 1.6
const AGENT = 0.3 // walking radius, used for collisions and pathfinding
const SPEED = 2.6
const STAND = 1.1 // how far in front of a piece the visitor stands

/*
  Pieces to walk up to. `sel` and `idx` pick the content from the page,
  `titleSel` the heading. Wall pieces hang on a wall (`rot` is the direction
  they face, 0 = +z, PI/2 = +x, PI = -z, -PI/2 = -x). Plinths stand in the room.
*/
const PIECES = [
  { id: 'intro', room: 'home', sel: '#home .hero__text', title: 'Welcome', kind: 'plaque', x: -3.2, y: 1.5, z: 4.43, rot: Math.PI, w: 1.6, h: 0.9 },
  { id: 'about', room: 'about', sel: '#about .about__body', titleSel: '.about__lead', kind: 'plaque', x: -4, y: 1.5, z: -4.42, rot: 0, w: 1.8, h: 1.0 },
  { id: 'skill0', room: 'skills', sel: '#skills .skill-group', idx: 0, titleSel: 'h3', kind: 'plinth', x: -1.5, z: -2.0, rot: Math.PI },
  { id: 'skill1', room: 'skills', sel: '#skills .skill-group', idx: 1, titleSel: 'h3', kind: 'plinth', x: -0.5, z: -2.0, rot: Math.PI },
  { id: 'skill2', room: 'skills', sel: '#skills .skill-group', idx: 2, titleSel: 'h3', kind: 'plinth', x: 0.5, z: -2.0, rot: Math.PI },
  { id: 'skill3', room: 'skills', sel: '#skills .skill-group', idx: 3, titleSel: 'h3', kind: 'plinth', x: 1.5, z: -2.0, rot: Math.PI },
  { id: 'job0', room: 'experience', sel: '#experience .job', idx: 0, titleSel: '.job__role', kind: 'frame', x: 3.0, y: 1.5, z: -4.42, rot: 0, w: 0.7, h: 0.5 },
  { id: 'job1', room: 'experience', sel: '#experience .job', idx: 1, titleSel: '.job__role', kind: 'frame', x: 4.0, y: 1.5, z: -4.42, rot: 0, w: 0.7, h: 0.5 },
  { id: 'job2', room: 'experience', sel: '#experience .job', idx: 2, titleSel: '.job__role', kind: 'frame', x: 5.0, y: 1.5, z: -4.42, rot: 0, w: 0.7, h: 0.5 },
  { id: 'proj0', room: 'projects', sel: '#projects .project', idx: 0, titleSel: '.project__title', kind: 'frame', x: -5.86, y: 1.2, z: -0.9, rot: Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'proj1', room: 'projects', sel: '#projects .project', idx: 1, titleSel: '.project__title', kind: 'frame', x: -5.86, y: 1.2, z: 0, rot: Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'proj2', room: 'projects', sel: '#projects .project', idx: 2, titleSel: '.project__title', kind: 'frame', x: -5.86, y: 1.2, z: 0.9, rot: Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'proj3', room: 'projects', sel: '#projects .project', idx: 3, titleSel: '.project__title', kind: 'frame', x: -5.86, y: 1.9, z: -0.9, rot: Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'proj4', room: 'projects', sel: '#projects .project', idx: 4, titleSel: '.project__title', kind: 'frame', x: -5.86, y: 1.9, z: 0, rot: Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'proj5', room: 'projects', sel: '#projects .project', idx: 5, titleSel: '.project__title', kind: 'frame', x: -5.86, y: 1.9, z: 0.9, rot: Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'cert0', room: 'certifications', sel: '#certifications .cert', idx: 0, titleSel: '.cert__title', kind: 'frame', x: 1.87, y: 1.4, z: -0.9, rot: -Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'cert1', room: 'certifications', sel: '#certifications .cert', idx: 1, titleSel: '.cert__title', kind: 'frame', x: 1.87, y: 1.4, z: 0.9, rot: -Math.PI / 2, w: 0.7, h: 0.5 },
  { id: 'contact', room: 'contact', sel: '#contact .contact__grid', title: 'Get in touch', kind: 'plinth', x: 5.4, z: 0.9, rot: Math.PI },
]

/*===== PAGE REFERENCES =====*/
const $house = $('#house')
const $body = document.body
const $toggle = $('#house-toggle')
const $chips = $$('.house__rooms .chip')
const $now = $('#house-now')
const $view = $('#house-view')
const $hint = $('#house-hint')
const $msg = $('#house-msg')
const $panel = $('#house-panel')
const $panelRoom = $('#house-panel-room')
const $panelTitle = $('#house-panel-title')
const $panelBody = $('#house-panel-body')
const $panelPrev = $('#house-panel-prev')
const $panelNext = $('#house-panel-next')

let inHouse = false
let scenePromise = null
let scene = null
let openedPiece = null
let currentRoom = null

/*===== CONTENT FOR THE PANEL (copied from the page, made safe to show here) =====*/
function sourceOf(piece) {
  if (!piece.sel) return null
  return document.querySelectorAll(piece.sel)[piece.idx || 0] || null
}

function titleOf(piece) {
  if (piece.title) return piece.title
  const src = sourceOf(piece)
  const el = src && piece.titleSel ? src.querySelector(piece.titleSel) : null
  return el ? el.textContent.trim() : piece.id
}

function contentFor(piece) {
  const src = sourceOf(piece)
  const wrap = document.createElement('div')
  if (!src) return wrap
  const copy = src.cloneNode(true)
  // Copies should show at once and not carry page behaviour.
  copy.querySelectorAll('[data-reveal]').forEach((el) => {
    el.removeAttribute('data-reveal')
    el.classList.add('is-visible')
  })
  copy.removeAttribute('data-reveal')
  copy.classList.add('is-visible')
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
  copy.querySelectorAll('button').forEach((btn) => {
    const span = document.createElement('span')
    span.className = btn.className
    span.textContent = btn.textContent
    btn.replaceWith(span)
  })
  copy.querySelectorAll('[hidden]').forEach((el) => (el.hidden = false))
  copy.querySelectorAll('details').forEach((d) => (d.open = true))
  copy.querySelectorAll('a[target]').forEach((a) => a.setAttribute('rel', 'noopener'))
  wrap.appendChild(copy)
  return wrap
}

function openPiece(piece) {
  openedPiece = piece
  $panelRoom.textContent = ROOMS[piece.room].name
  $panelTitle.textContent = titleOf(piece)
  $panelBody.replaceChildren(contentFor(piece))
  $panelBody.scrollTop = 0
  $panel.hidden = false
  const i = PIECES.indexOf(piece)
  $panelPrev.disabled = i <= 0
  $panelNext.disabled = i >= PIECES.length - 1
  $hint.hidden = true
}

function closePanel() {
  openedPiece = null
  $panel.hidden = true
}

function stepPiece(delta) {
  const i = PIECES.indexOf(openedPiece)
  const next = PIECES[i + delta]
  if (next && scene) scene.visitPiece(next)
}

/*===== ROOMS, CHIPS AND HUD =====*/
function setRoomNow(id) {
  if (id === currentRoom) return
  currentRoom = id
  const name = ROOMS[id] ? ROOMS[id].name : 'Outside'
  $now.textContent = name
  $chips.forEach((chip) => chip.setAttribute('aria-current', String(chip.dataset.room === id)))
}

function showMsg(text) {
  $msg.textContent = text
  $msg.hidden = !text
}

function paintToggle() {
  const label = inHouse ? 'Leave the house' : 'Walk through the house'
  $('i', $toggle).className = inHouse ? 'bx bx-log-out' : 'bx bx-home-alt'
  $toggle.setAttribute('aria-label', label)
  $toggle.title = label
}

/*===== ENTER AND LEAVE =====*/
function loadScene() {
  if (!scenePromise) scenePromise = buildScene().then((s) => (scene = s))
  return scenePromise
}

async function enterHouse(startId = 'home') {
  $house.hidden = false
  showMsg('Loading the house…')
  const s = await loadScene()
  if (!s) {
    $house.hidden = true
    console.warn('The 3D house needs WebGL and an internet connection. Showing the sections instead.')
    document.getElementById('about').scrollIntoView({ behavior: 'auto', block: 'start' })
    return
  }
  inHouse = true
  $body.classList.add('is-house')
  paintToggle()
  showMsg('')
  s.start(startId)
  $house.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

function exitHouse() {
  inHouse = false
  $body.classList.remove('is-house')
  $house.hidden = true
  closePanel()
  scene && scene.stop()
  paintToggle()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

window.houseWalk = {
  active: () => inHouse,
  goTo: (id) => {
    if (!scene) return
    if (ROOMS[id]) scene.walkToRoom(id)
    else {
      const piece = PIECES.find((p) => p.id === id || p.room === id)
      if (piece) scene.visitPiece(piece)
    }
  },
}

/*===== EVENTS =====*/
$toggle.addEventListener('click', () => (inHouse ? exitHouse() : enterHouse()))
$('#house-start').addEventListener('click', () => enterHouse('home'))
$('#house-exit').addEventListener('click', exitHouse)
$('#house-panel-close').addEventListener('click', closePanel)
$panelPrev.addEventListener('click', () => stepPiece(-1))
$panelNext.addEventListener('click', () => stepPiece(1))
$chips.forEach((chip) =>
  chip.addEventListener('click', () => scene && scene.walkToRoom(chip.dataset.room))
)
$view.addEventListener('click', () => {
  if (!scene) return
  const overview = scene.toggleView()
  $view.setAttribute('aria-pressed', String(overview))
  $view.textContent = overview ? 'Walk' : 'Overview'
})

// Links to sections walk you to that room instead of scrolling past the house.
document.addEventListener(
  'click',
  (e) => {
    if (!inHouse) return
    const link = e.target.closest('a[href^="#"]')
    if (!link) return
    const id = link.getAttribute('href').slice(1)
    const piece = PIECES.find((p) => p.room === id)
    if (!ROOMS[id] && !piece) return
    e.preventDefault()
    if (ROOMS[id]) scene.walkToRoom(id)
    else scene.visitPiece(piece)
  },
  true
)

document.addEventListener('keydown', (e) => {
  if (!inHouse || e.target.closest('input, textarea, select, [contenteditable]')) return
  if (e.key === 'Escape') {
    if (openedPiece) closePanel()
    return
  }
  if (e.key === 'e' || e.key === 'E') scene && scene.interact()
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
})

/*===== 3D SCENE =====*/
async function buildScene() {
  let THREE
  try {
    THREE = await import('three')
  } catch (err) {
    return null
  }
  const host = $('#house-scene')
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch (err) {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  host.prepend(renderer.domElement)
  const dom = renderer.domElement
  dom.style.touchAction = 'none'

  const world = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 80)

  const palette = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    return dark
      ? { floor: 0x2a2927, active: 0x4d3a2c, wall: 0x5a5852, furn: 0x3c3b37, accent: 0xe2934f, wood: 0x6e5a48, plant: 0x4f7a55, skin: 0xd9b48f, rug: 0x4a3a2c, figure: 0xefeee9, card: 0x22211f, ink: '#efeee9', paper: '#22211f' }
      : { floor: 0xe9e5dd, active: 0xeccbb0, wall: 0xc9c4b9, furn: 0xb7b1a5, accent: 0xa85a24, wood: 0x9c8064, plant: 0x6f9a74, skin: 0xe2b996, rug: 0xd8c3ad, figure: 0x1c1c1a, card: 0xfdfcfa, ink: '#1c1c1a', paper: '#fdfcfa' }
  }
  let pal = palette()
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 })
  const M = {}
  for (const k of ['floor', 'active', 'wall', 'furn', 'accent', 'wood', 'plant', 'skin', 'rug', 'figure']) M[k] = mat(pal[k])

  world.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.3))
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(8, 18, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 })
  world.add(sun)

  // Colliders: axis-aligned boxes the visitor cannot pass through
  const colliders = []
  const box = (w, h, d, x, y, z, material, { solid = true, cast = true } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    m.position.set(x, y, z)
    m.castShadow = cast
    m.receiveShadow = true
    world.add(m)
    if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 })
    return m
  }

  const ground = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.3, 10.6), M.furn)
  ground.position.set(0, -0.16, 0.6)
  ground.receiveShadow = true
  world.add(ground)

  // Floors, one per room
  const floors = {}
  for (const id of ORDER) {
    const r = ROOMS[id]
    const f = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, 0.06, r.z1 - r.z0), M.floor)
    f.position.set((r.x0 + r.x1) / 2, 0.03, (r.z0 + r.z1) / 2)
    f.receiveShadow = true
    f.userData.room = id
    world.add(f)
    floors[id] = f
  }

  // Walls with doorway gaps; shared walls are built once
  const seen = new Set()
  const pieces = (dir, pos, from, to) => {
    const gaps = DOORS.filter((d) => d.dir === dir && (dir === 'h' ? d.z : d.x) === pos)
      .map((d) => (dir === 'h' ? d.x : d.z))
      .filter((c) => c > from && c < to)
      .sort((p, q) => p - q)
    const out = []
    let start = from
    for (const c of gaps) {
      out.push([start, c - DOOR_W / 2])
      start = c + DOOR_W / 2
    }
    out.push([start, to])
    return out.filter(([a, b]) => b - a > 0.05)
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
      for (const [a, b] of pieces(e.dir, e.pos, e.from, e.to)) {
        const key = `${e.dir}:${e.pos}:${a.toFixed(2)}:${b.toFixed(2)}`
        if (seen.has(key)) continue
        seen.add(key)
        if (e.dir === 'h') box(b - a, WALL_H, WALL_T, (a + b) / 2, WALL_H / 2, e.pos, M.wall)
        else box(WALL_T, WALL_H, b - a, e.pos, WALL_H / 2, (a + b) / 2, M.wall)
      }
    }
  }

  // Furniture
  const c = (id) => ({ x: (ROOMS[id].x0 + ROOMS[id].x1) / 2, z: (ROOMS[id].z0 + ROOMS[id].z1) / 2 })
  const s = c('about')
  box(1.8, 0.08, 0.8, s.x, 0.74, -3.6, M.wood)
  box(0.9, 0.5, 0.05, s.x, 1.1, -3.95, M.furn)
  box(0.5, 0.1, 0.5, s.x, 0.45, -2.5, M.furn, { solid: false })
  const l = c('skills')
  box(2.2, 0.45, 0.9, l.x, 0.23, -4.0, M.accent)
  box(2.2, 0.55, 0.22, l.x, 0.6, -4.3, M.accent)
  box(1.2, 0.08, 0.6, l.x, 0.38, -2.7, M.wood)
  const w = c('experience')
  box(3.0, 0.9, 0.8, w.x, 0.45, -4.1, M.wood)
  box(0.7, 0.6, 0.7, w.x + 1.6, 0.3, -2.6, M.wood)
  const lb = c('certifications')
  box(1.2, 2.0, 0.4, lb.x - 1.4, 1.0, -1.3, M.wood)
  box(1.2, 2.0, 0.4, lb.x + 1.4, 1.0, -1.3, M.wood)
  box(1.0, 0.75, 0.6, lb.x, 0.37, 0.4, M.wood)
  box(4.5, 0.02, 2.4, 0, 0.07, 3.0, M.rug, { solid: false, cast: false })
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.6, 16), M.furn)
  pot.position.set(5.2, 0.3, -0.6)
  pot.castShadow = true
  world.add(pot)
  colliders.push({ minX: 4.9, maxX: 5.5, minZ: -0.9, maxZ: -0.3 })
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), M.plant)
  leaves.position.set(5.2, 0.9, -0.6)
  leaves.castShadow = true
  world.add(leaves)

  // Labels for the pieces: a card with the title, drawn on a canvas
  const cardTexture = (text, sub) => {
    const cv = document.createElement('canvas')
    cv.width = 512
    cv.height = 320
    const g = cv.getContext('2d')
    g.fillStyle = pal.paper
    g.fillRect(0, 0, cv.width, cv.height)
    g.fillStyle = pal.ink
    g.font = '500 46px Georgia, serif'
    const words = text.split(' ')
    let line = ''
    let y = 110
    const lines = []
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (g.measureText(test).width > 440 && line) {
        lines.push(line)
        line = word
      } else line = test
    }
    lines.push(line)
    lines.slice(0, 3).forEach((ln, i) => g.fillText(ln, 36, y + i * 56))
    if (sub) {
      g.font = '400 28px system-ui, sans-serif'
      g.globalAlpha = 0.6
      g.fillText(sub, 36, 280)
    }
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  // Build every piece: its object, its collider and its label
  const meshes = []
  for (const piece of PIECES) {
    const title = titleOf(piece)
    const group = new THREE.Group()
    group.position.set(piece.x, piece.y || 0, piece.z)
    group.rotation.y = piece.rot
    world.add(group)
    const hit = []

    if (piece.kind === 'plinth') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), M.wood)
      top.position.y = 0.45
      top.castShadow = true
      top.receiveShadow = true
      group.add(top)
      colliders.push({ minX: piece.x - 0.25, maxX: piece.x + 0.25, minZ: piece.z - 0.25, maxZ: piece.z + 0.25 })
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.44, 0.27),
        new THREE.MeshStandardMaterial({ map: cardTexture(title), roughness: 0.6 })
      )
      label.position.set(0, 0.7, 0.26)
      group.add(label)
      hit.push(top, label)
    } else if (piece.kind === 'frame' || piece.kind === 'plaque') {
      const back = new THREE.Mesh(new THREE.BoxGeometry(piece.w + 0.06, piece.h + 0.06, 0.04), M.furn)
      back.position.z = -0.02
      back.castShadow = true
      group.add(back)
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(piece.w, piece.h),
        new THREE.MeshStandardMaterial({ map: cardTexture(title, piece.kind === 'plaque' ? 'Click to read' : ''), roughness: 0.6 })
      )
      face.position.z = 0.03
      group.add(face)
      hit.push(back, face)
    }

    for (const m of hit) {
      m.userData.piece = piece
      meshes.push(m)
    }
  }

  // Visitor: first person by default, with a figure shown from above
  const figure = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.75, 16), M.figure)
  body.position.y = 0.85
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M.skin)
  head.position.y = 1.5
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.14), M.figure)
  const legR = legL.clone()
  legL.position.set(-0.1, 0.25, 0)
  legR.position.set(0.1, 0.25, 0)
  figure.add(body, head, legL, legR)
  figure.traverse((o) => o.isMesh && (o.castShadow = true))
  world.add(figure)

  // Overview labels for rooms
  const labelHost = $('#house-labels')
  const roomLabels = {}
  for (const id of ORDER) {
    const el = document.createElement('span')
    el.className = 'house-label'
    el.textContent = ROOMS[id].name
    labelHost.appendChild(el)
    roomLabels[id] = el
  }

  // Walking state
  const player = { x: 0, z: 3 }
  let yaw = 0
  let pitch = 0
  let view = 'walk' // 'walk' | 'overview'
  let path = []
  let arrive = null
  let standFacing = null
  const keys = new Set()

  const circleBlocked = (x, z) => {
    if (x < -6.9 || x > 6.9 || z < -5.2 || z > 5.2) return true
    for (const k of colliders) {
      const cx = Math.min(Math.max(x, k.minX), k.maxX)
      const cz = Math.min(Math.max(z, k.minZ), k.maxZ)
      if ((x - cx) ** 2 + (z - cz) ** 2 < AGENT * AGENT) return true
    }
    return false
  }

  // Grid pathfinding for clicks
  const CELL = 0.25
  const X0 = -7
  const Z0 = -5.5
  const NX = Math.round(14 / CELL)
  const NZ = Math.round(11 / CELL)
  const cellFree = (i, j) => {
    if (i < 0 || j < 0 || i >= NX || j >= NZ) return false
    return !circleBlocked(X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL)
  }
  const cellOf = (x, z) => [Math.floor((x - X0) / CELL), Math.floor((z - Z0) / CELL)]
  const cellPos = (i, j) => ({ x: X0 + (i + 0.5) * CELL, z: Z0 + (j + 0.5) * CELL })

  function nearestFree(x, z) {
    const [i0, j0] = cellOf(x, z)
    for (let r = 0; r < 12; r++) {
      for (let di = -r; di <= r; di++) {
        for (let dj = -r; dj <= r; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
          if (cellFree(i0 + di, j0 + dj)) return [i0 + di, j0 + dj]
        }
      }
    }
    return null
  }

  function findPath(fromX, fromZ, toX, toZ) {
    const start = cellOf(fromX, fromZ)
    let goal = cellOf(toX, toZ)
    if (!cellFree(goal[0], goal[1])) {
      const near = nearestFree(toX, toZ)
      if (!near) return []
      goal = near
    }
    const key = (i, j) => j * NX + i
    const h = (i, j) => Math.abs(i - goal[0]) + Math.abs(j - goal[1])
    const open = [{ i: start[0], j: start[1], g: 0, f: h(...start) }]
    const came = new Map()
    const gScore = new Map([[key(...start), 0]])
    const closed = new Set()
    while (open.length) {
      let best = 0
      for (let n = 1; n < open.length; n++) if (open[n].f < open[best].f) best = n
      const cur = open.splice(best, 1)[0]
      const ck = key(cur.i, cur.j)
      if (cur.i === goal[0] && cur.j === goal[1]) {
        const out = []
        let k = ck
        while (came.has(k)) {
          const [ci, cj] = [k % NX, Math.floor(k / NX)]
          out.unshift(cellPos(ci, cj))
          k = came.get(k)
        }
        return out
      }
      closed.add(ck)
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = cur.i + di
        const nj = cur.j + dj
        if (!cellFree(ni, nj)) continue
        const nk = key(ni, nj)
        if (closed.has(nk)) continue
        const ng = cur.g + 1
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng)
          came.set(nk, ck)
          open.push({ i: ni, j: nj, g: ng, f: ng + h(ni, nj) })
        }
      }
    }
    return []
  }

  function walkTo(x, z, onArrive) {
    arrive = onArrive || null
    standFacing = null
    path = findPath(player.x, player.z, x, z)
    if (!path.length) {
      arrive = null
      return false
    }
    return true
  }

  function roomAt(x, z) {
    for (const id of ORDER) {
      const r = ROOMS[id]
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return id
    }
    return null
  }

  function standPoint(piece) {
    const fx = Math.sin(piece.rot)
    const fz = Math.cos(piece.rot)
    return { x: piece.x + fx * STAND, z: piece.z + fz * STAND, fx, fz }
  }

  function faceTowards(x, z) {
    const dx = x - player.x
    const dz = z - player.z
    yaw = Math.atan2(-dx, -dz)
  }

  // Walk to a piece, stand in front of it, face it and open it
  function visitPiece(piece) {
    const sp = standPoint(piece)
    const ok = walkTo(sp.x, sp.z, () => {
      faceTowards(piece.x, piece.z)
      openPiece(piece)
    })
    if (!ok) {
      faceTowards(piece.x, piece.z)
      openPiece(piece)
    }
  }

  function walkToRoom(id) {
    const r = ROOMS[id]
    const cx = (r.x0 + r.x1) / 2
    const cz = (r.z0 + r.z1) / 2
    closePanel()
    walkTo(cx, cz, null)
  }

  // Nearest piece to the visitor, within reach
  function nearestPiece(maxDist) {
    let best = null
    let bestD = maxDist
    for (const p of PIECES) {
      const d = Math.hypot(p.x - player.x, p.z - player.z)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  }

  // Lookup for the piece under the centre of the screen
  const ray = new THREE.Raycaster()
  const centre = new THREE.Vector2(0, 0)
  let hinted = null

  let last = performance.now()
  let running = false
  let raf = 0
  const cam = { theta: 0.6, phi: 0.95, r: 20, target: new THREE.Vector3(0, 0.5, 0.6) }
  const dragged = { active: false, x: 0, y: 0, moved: 0 }

  function updateCamera(dt) {
    if (view === 'walk') {
      camera.position.set(player.x, EYE, player.z)
      camera.rotation.set(pitch, yaw, 0, 'YXZ')
      figure.visible = false
    } else {
      figure.visible = true
      cam.target.x += (player.x - cam.target.x) * Math.min(1, dt * 3)
      cam.target.z += (player.z - cam.target.z) * Math.min(1, dt * 3)
      const x = cam.r * Math.sin(cam.phi) * Math.sin(cam.theta)
      const y = cam.r * Math.cos(cam.phi)
      const z = cam.r * Math.sin(cam.phi) * Math.cos(cam.theta)
      camera.position.set(cam.target.x + x, cam.target.y + y, cam.target.z + z)
      camera.lookAt(cam.target)
    }
  }

  function frame(now) {
    if (!running) return
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const speed = reduceMotion ? SPEED * 2 : SPEED

    // Keyboard movement, relative to where you look
    let mx = 0
    let mz = 0
    if (keys.has('w') || keys.has('ArrowUp')) { mx -= Math.sin(yaw); mz -= Math.cos(yaw) }
    if (keys.has('s') || keys.has('ArrowDown')) { mx += Math.sin(yaw); mz += Math.cos(yaw) }
    if (keys.has('a') || keys.has('ArrowLeft')) { mx -= Math.cos(yaw); mz += Math.sin(yaw) }
    if (keys.has('d') || keys.has('ArrowRight')) { mx += Math.cos(yaw); mz -= Math.sin(yaw) }
    if (mx || mz) {
      path = []
      arrive = null
      const len = Math.hypot(mx, mz)
      const step = (speed * dt) / len
      const nx = player.x + mx * step
      const nz = player.z + mz * step
      if (!circleBlocked(nx, player.z)) player.x = nx
      if (!circleBlocked(player.x, nz)) player.z = nz
    }

    // Walking along a path
    if (path.length) {
      const t = path[0]
      const dx = t.x - player.x
      const dz = t.z - player.z
      const dist = Math.hypot(dx, dz)
      const step = speed * dt
      if (dist <= step) {
        player.x = t.x
        player.z = t.z
        path.shift()
      } else {
        player.x += (dx / dist) * step
        player.z += (dz / dist) * step
        yaw = Math.atan2(-dx, -dz)
      }
      if (!path.length && arrive) {
        const done = arrive
        arrive = null
        done()
      }
    }

    figure.position.set(player.x, 0, player.z)
    figure.rotation.y = yaw + Math.PI
    updateCamera(dt)

    // Which room are you in
    const here = roomAt(player.x, player.z)
    if (here) {
      setRoomNow(here)
      for (const id of ORDER) floors[id].material = id === here ? M.active : M.floor
    }

    // Hint for the piece in the centre of the screen
    if (view === 'walk' && !openedPiece) {
      ray.setFromCamera(centre, camera)
      const hits = ray.intersectObjects(meshes, false).filter((h) => h.distance < 3.2)
      hinted = hits.length ? hits[0].object.userData.piece : nearestPiece(1.6)
      if (hinted) {
        $hint.textContent = `Press E or click to view: ${titleOf(hinted)}`
        $hint.hidden = false
      } else $hint.hidden = true
    } else $hint.hidden = true

    // Room labels in overview only
    const w = host.clientWidth
    const h = host.clientHeight
    for (const id of ORDER) {
      const el = roomLabels[id]
      if (view !== 'overview') {
        el.hidden = true
        continue
      }
      el.hidden = false
      const r = ROOMS[id]
      const v = new THREE.Vector3((r.x0 + r.x1) / 2, 0.2, (r.z0 + r.z1) / 2).project(camera)
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`
      el.classList.toggle('is-active', id === here)
    }

    renderer.render(world, camera)
    raf = requestAnimationFrame(frame)
  }

  // Input
  const pick = (e) => {
    const rect = dom.getBoundingClientRect()
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    ray.setFromCamera(v, camera)
    return ray.intersectObjects([...meshes, ...Object.values(floors)], false)[0] || null
  }

  dom.addEventListener('pointerdown', (e) => {
    dragged.active = true
    dragged.x = e.clientX
    dragged.y = e.clientY
    dragged.moved = 0
    dom.setPointerCapture(e.pointerId)
  })
  dom.addEventListener('pointermove', (e) => {
    if (dragged.active) {
      const dx = e.clientX - dragged.x
      const dy = e.clientY - dragged.y
      dragged.moved += Math.abs(dx) + Math.abs(dy)
      dragged.x = e.clientX
      dragged.y = e.clientY
      if (view === 'walk') {
        yaw -= dx * 0.005
        pitch = Math.min(0.6, Math.max(-0.7, pitch - dy * 0.004))
      } else {
        cam.theta -= dx * 0.008
        cam.phi = Math.min(1.3, Math.max(0.35, cam.phi - dy * 0.005))
      }
      return
    }
    const hit = pick(e)
    dom.style.cursor = hit && hit.object.userData.piece ? 'pointer' : hit ? 'pointer' : 'grab'
  })
  dom.addEventListener('pointerup', (e) => {
    if (dragged.active && dragged.moved < 6) {
      const hit = pick(e)
      if (hit) closePanel()
      if (hit && hit.object.userData.piece) visitPiece(hit.object.userData.piece)
      else if (hit && hit.object.userData.room) walkTo(hit.point.x, hit.point.z, null)
    }
    dragged.active = false
  })
  dom.addEventListener(
    'wheel',
    (e) => {
      if (view !== 'overview') return
      e.preventDefault()
      cam.r = Math.min(30, Math.max(12, cam.r + e.deltaY * 0.01))
    },
    { passive: false }
  )
  document.addEventListener('keydown', (e) => keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key))
  document.addEventListener('keyup', (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key))
  window.addEventListener('blur', () => keys.clear())

  const resize = () => {
    const w = host.clientWidth
    const h = host.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(host)

  new MutationObserver(() => {
    pal = palette()
    for (const k of ['floor', 'active', 'wall', 'furn', 'accent', 'wood', 'plant', 'skin', 'rug', 'figure']) M[k].color.setHex(pal[k])
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  resize()

  return {
    start(startId) {
      const r = ROOMS[startId] || ROOMS.home
      const cell = nearestFree((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2)
      const spot = cell ? cellPos(cell[0], cell[1]) : { x: 0, z: 3 }
      player.x = spot.x
      player.z = spot.z
      path = []
      yaw = 0
      pitch = 0
      if (!running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
      keys.clear()
    },
    walkToRoom,
    visitPiece,
    interact() {
      if (openedPiece) return
      const piece = hinted || nearestPiece(2.2)
      if (piece) visitPiece(piece)
    },
    toggleView() {
      view = view === 'walk' ? 'overview' : 'walk'
      if (view === 'overview') {
        cam.target.set(player.x, 0.5, player.z)
      } else {
        pitch = 0
      }
      return view === 'overview'
    },
  }
}

setRoomNow('home')
paintToggle()
