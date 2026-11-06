/*
  A walk-through museum of the portfolio.

  You walk through the house from the inside: WASD or arrows, the on-screen
  joystick, or click the floor to walk. Each room holds pieces you can walk up
  to (project frames, skill plinths, job frames, certificates, the contact
  mailbox). Opening a piece shows its details in a panel inside the scene,
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

// One colour per room, used for floors, labels, the minimap and the chips
const ROOM_COLOR = {
  home: '#c8875a',
  about: '#7f9e96',
  skills: '#d9a441',
  experience: '#6f86a6',
  projects: '#c4655a',
  certifications: '#8d9a5b',
  contact: '#5fa3b8',
}

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
const AGENT = 0.3
const SPEED = 2.6
const STAND = 1.1
const GUIDE_KEY = 'houseGuideSeen'

/*
  Pieces to walk up to. `sel` and `idx` pick the content from the page,
  `titleSel` the heading. Wall pieces hang on a wall (`rot` is the direction
  they face: 0 = +z, PI/2 = +x, PI = -z, -PI/2 = -x). Plinths stand in a room.
*/
const PIECES = [
  { id: 'intro', room: 'home', sel: '#home .hero__text', title: 'Welcome', kind: 'plaque', x: -3.2, y: 1.5, z: 4.43, rot: Math.PI, w: 1.6, h: 0.9 },
  { id: 'about', room: 'about', sel: '#about .about__body', titleSel: '.about__lead', kind: 'plaque', x: -4, y: 1.5, z: -4.42, rot: 0, w: 1.8, h: 1.0 },
  { id: 'skill0', room: 'skills', sel: '#skills .skill-group', idx: 0, titleSel: 'h3', kind: 'plinth', x: -1.6, z: -2.0, rot: Math.PI },
  { id: 'skill1', room: 'skills', sel: '#skills .skill-group', idx: 1, titleSel: 'h3', kind: 'plinth', x: -1.0, z: -2.0, rot: Math.PI },
  { id: 'skill2', room: 'skills', sel: '#skills .skill-group', idx: 2, titleSel: 'h3', kind: 'plinth', x: 1.0, z: -2.0, rot: Math.PI },
  { id: 'skill3', room: 'skills', sel: '#skills .skill-group', idx: 3, titleSel: 'h3', kind: 'plinth', x: 1.6, z: -2.0, rot: Math.PI },
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
const $view = $('#house-view')
const $hint = $('#house-hint')
const $toast = $('#house-toast')
const $msg = $('#house-msg')
const $panel = $('#house-panel')
const $panelRoom = $('#house-panel-room')
const $panelTitle = $('#house-panel-title')
const $panelBody = $('#house-panel-body')
const $panelPrev = $('#house-panel-prev')
const $panelNext = $('#house-panel-next')
const $roomName = $('#house-room-name')
const $roomMeta = $('#house-room-meta')
const $roomList = $('#house-room-list')
const $roomNext = $('#house-next')
const $minimap = $('#house-minimap')
const $guide = $('#house-guide')
const $joy = $('#house-joy')
const $joyKnob = $('#house-joy-knob')

let inHouse = false
let scenePromise = null
let scene = null
let openedPiece = null
let currentRoom = null
const viewed = new Set()
const visited = new Set()
const input = { joy: { x: 0, y: 0 } }
let toastTimer = 0

/*===== CONTENT FOR THE PANEL (copied from the page) =====*/
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
  copy.removeAttribute('data-reveal')
  copy.querySelectorAll('[data-reveal]').forEach((el) => el.removeAttribute('data-reveal'))
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
  wrap.appendChild(copy)
  return wrap
}

function openPiece(piece) {
  openedPiece = piece
  viewed.add(piece.id)
  $panel.style.setProperty('--room', ROOM_COLOR[piece.room])
  $panelRoom.textContent = ROOMS[piece.room].name
  $panelTitle.textContent = titleOf(piece)
  $panelBody.replaceChildren(contentFor(piece))
  $panelBody.scrollTop = 0
  $panel.hidden = false
  $('#house-scene').classList.add('has-panel')
  const i = PIECES.indexOf(piece)
  $panelPrev.disabled = i <= 0
  $panelNext.disabled = i >= PIECES.length - 1
  $hint.hidden = true
  renderRoomCard()
}

function closePanel() {
  openedPiece = null
  $panel.hidden = true
  $('#house-scene').classList.remove('has-panel')
}

function stepPiece(delta) {
  const next = PIECES[PIECES.indexOf(openedPiece) + delta]
  if (next && scene) scene.visitPiece(next)
}

/*===== ROOM CARD, CHIPS AND MINIMAP =====*/
function renderRoomCard() {
  if (!currentRoom || !ROOMS[currentRoom]) return
  const pieces = PIECES.filter((p) => p.room === currentRoom)
  const seen = pieces.filter((p) => viewed.has(p.id)).length
  $roomName.textContent = ROOMS[currentRoom].name
  $roomName.style.setProperty('--room', ROOM_COLOR[currentRoom])
  $roomMeta.textContent = pieces.length
    ? `${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'} here · ${seen} viewed`
    : 'Nothing to view here'
  $roomList.replaceChildren(
    ...pieces.map((p) => {
      const li = document.createElement('li')
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'house-room__piece'
      btn.dataset.piece = p.id
      const label = document.createElement('span')
      label.textContent = titleOf(p)
      const mark = document.createElement('i')
      mark.className = viewed.has(p.id) ? 'bx bx-check-circle' : 'bx bx-chevron-right'
      mark.setAttribute('aria-hidden', 'true')
      btn.append(label, mark)
      if (viewed.has(p.id)) btn.classList.add('is-viewed')
      btn.addEventListener('click', () => scene && scene.visitPiece(p))
      li.appendChild(btn)
      return li
    })
  )
  const next = nextRoom()
  $roomNext.hidden = !next
  if (next) {
    $roomNext.textContent = `Next: ${ROOMS[next].name}`
    $roomNext.dataset.room = next
  }
}

// The next room you have not visited yet, in walking order
function nextRoom() {
  const start = ORDER.indexOf(currentRoom)
  for (let k = 1; k < ORDER.length; k++) {
    const id = ORDER[(start + k) % ORDER.length]
    if (!visited.has(id)) return id
  }
  return null
}

function setRoomNow(id) {
  if (id === currentRoom || !ROOMS[id]) return
  currentRoom = id
  visited.add(id)
  $chips.forEach((chip) => {
    chip.setAttribute('aria-current', String(chip.dataset.room === id))
    chip.classList.toggle('is-visited', visited.has(chip.dataset.room))
  })
  renderRoomCard()
  showToast(`${ROOMS[id].name} · ${PIECES.filter((p) => p.room === id).length} to view`)
}

function showToast(text) {
  $toast.textContent = text
  $toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => ($toast.hidden = true), 2600)
}

function showMsg(text) {
  $msg.textContent = text
  $msg.hidden = !text
}

// Floor plan in the corner: rooms, you, your heading and the route
function drawMinimap(state) {
  const ctx = $minimap.getContext('2d')
  const W = $minimap.width
  const H = $minimap.height
  const tx = (x) => ((x + 7) / 14) * W
  const tz = (z) => ((z + 5.5) / 11) * H
  ctx.clearRect(0, 0, W, H)
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  for (const id of ORDER) {
    const r = ROOMS[id]
    const x = tx(r.x0)
    const y = tz(r.z0)
    const w = tx(r.x1) - x
    const h = tz(r.z1) - y
    const isHere = id === state.room
    ctx.globalAlpha = isHere ? 0.55 : visited.has(id) ? 0.28 : 0.14
    ctx.fillStyle = ROOM_COLOR[id]
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4)
    ctx.globalAlpha = 1
    ctx.strokeStyle = isHere ? ROOM_COLOR[id] : dark ? 'rgba(239,238,233,.25)' : 'rgba(28,28,26,.25)'
    ctx.lineWidth = isHere ? 2 : 1
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4)
    ctx.fillStyle = dark ? '#efeee9' : '#1c1c1a'
    ctx.font = '600 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(r.name, x + w / 2, y + h / 2)
  }
  // route
  if (state.path.length) {
    ctx.strokeStyle = ROOM_COLOR[state.target] || '#a85a24'
    ctx.lineWidth = 3
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(tx(state.x), tz(state.z))
    for (const p of state.path) ctx.lineTo(tx(p.x), tz(p.z))
    ctx.stroke()
    ctx.setLineDash([])
  }
  // you
  const px = tx(state.x)
  const pz = tz(state.z)
  ctx.save()
  ctx.translate(px, pz)
  // the arrow points where you are looking: forward is (-sin yaw, -cos yaw) on the floor
  ctx.rotate(Math.atan2(-Math.cos(state.yaw), -Math.sin(state.yaw)) + Math.PI / 2)
  ctx.fillStyle = '#a85a24'
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(7, 6)
  ctx.lineTo(-7, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#a85a24'
  ctx.beginPath()
  ctx.arc(px, pz, 5, 0, Math.PI * 2)
  ctx.fill()
}

// Tap a room on the floor plan to walk there
$minimap.addEventListener('click', (e) => {
  if (!scene) return
  const rect = $minimap.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 14 - 7
  const z = ((e.clientY - rect.top) / rect.height) * 11 - 5.5
  const id = ORDER.find((k) => x >= ROOMS[k].x0 && x <= ROOMS[k].x1 && z >= ROOMS[k].z0 && z <= ROOMS[k].z1)
  if (id) scene.walkToRoom(id)
})

/*===== JOYSTICK =====*/
let joyPointer = null
function moveJoy(e) {
  const rect = $joy.getBoundingClientRect()
  const max = rect.width / 2 - 22
  let dx = e.clientX - (rect.left + rect.width / 2)
  let dy = e.clientY - (rect.top + rect.height / 2)
  const len = Math.hypot(dx, dy)
  if (len > max) {
    dx = (dx * max) / len
    dy = (dy * max) / len
  }
  $joyKnob.style.transform = `translate(${dx}px, ${dy}px)`
  input.joy.x = dx / max
  input.joy.y = -dy / max
}
function endJoy(e) {
  if (e.pointerId !== joyPointer) return
  joyPointer = null
  input.joy.x = 0
  input.joy.y = 0
  $joyKnob.style.transform = 'translate(0px, 0px)'
}
$joy.addEventListener('pointerdown', (e) => {
  joyPointer = e.pointerId
  $joy.setPointerCapture(e.pointerId)
  moveJoy(e)
  e.preventDefault()
})
$joy.addEventListener('pointermove', (e) => {
  if (e.pointerId === joyPointer) moveJoy(e)
})
$joy.addEventListener('pointerup', endJoy)
$joy.addEventListener('pointercancel', endJoy)

/*===== ENTER AND LEAVE =====*/
function paintToggle() {
  const label = inHouse ? 'Leave the house' : 'Walk through the house'
  $('i', $toggle).className = inHouse ? 'bx bx-log-out' : 'bx bx-home-alt'
  $toggle.setAttribute('aria-label', label)
  $toggle.title = label
}

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
  let seen = false
  try {
    seen = localStorage.getItem(GUIDE_KEY) === '1'
  } catch (e) {}
  $guide.hidden = seen
}

function exitHouse() {
  inHouse = false
  $body.classList.remove('is-house')
  $house.hidden = true
  closePanel()
  $toast.hidden = true
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
$roomNext.addEventListener('click', () => scene && scene.walkToRoom($roomNext.dataset.room))
$chips.forEach((chip) => chip.addEventListener('click', () => scene && scene.walkToRoom(chip.dataset.room)))
$('#house-guide-close').addEventListener('click', () => {
  $guide.hidden = true
  try {
    localStorage.setItem(GUIDE_KEY, '1')
  } catch (e) {}
})
$view.addEventListener('click', () => {
  if (!scene) return
  const overview = scene.toggleView()
  $view.setAttribute('aria-pressed', String(overview))
  $view.textContent = overview ? 'Back to walking' : 'Overview'
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
const PALETTE = {
  light: {
    floor: 0xf1ece4, wall: 0xe9e3d7, trim: 0xcdc3b1, furn: 0xd8cfbf, wood: 0xb08b62, plant: 0x6f9a74,
    skin: 0xe2b996, rug: 0xe0c4a4, figure: 0x1c1c1a, ceiling: 0xfbf8f2, paper: '#fdfcfa', ink: '#1c1c1a', ground: 0xc7bca9,
  },
  dark: {
    floor: 0x262523, wall: 0x3a3935, trim: 0x4a4740, furn: 0x4b4840, wood: 0x7a5f47, plant: 0x4f7a55,
    skin: 0xd9b48f, rug: 0x6b4a36, figure: 0xefeee9, ceiling: 0x2e2d2a, paper: '#22211f', ink: '#efeee9', ground: 0x1f1e1c,
  },
}

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  host.prepend(renderer.domElement)
  const dom = renderer.domElement
  dom.style.touchAction = 'none'
  const anisotropy = renderer.capabilities.getMaxAnisotropy()

  const world = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 80)

  const themeKey = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
  let pal = PALETTE[themeKey()]
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...extra })
  const M = {}
  const setMats = () => {
    M.wall = M.wall || mat(pal.wall)
    M.trim = M.trim || mat(pal.trim)
    M.furn = M.furn || mat(pal.furn)
    M.wood = M.wood || mat(pal.wood)
    M.plant = M.plant || mat(pal.plant)
    M.skin = M.skin || mat(pal.skin)
    M.rug = M.rug || mat(pal.rug)
    M.figure = M.figure || mat(pal.figure)
    M.ceiling = M.ceiling || mat(pal.ceiling)
    M.ground = M.ground || mat(pal.ground)
  }
  setMats()

  // Light: warm sun, a soft fill, and a warm pendant over each room
  world.add(new THREE.HemisphereLight(0xfff4e6, 0x8a7f70, 1.2))
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.6)
  sun.position.set(9, 18, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 })
  world.add(sun)
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.35)
  fill.position.set(-10, 8, -6)
  world.add(fill)

  // Colliders: boxes the visitor cannot pass through
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

  const ground = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.3, 10.6), M.ground)
  ground.position.set(0, -0.16, 0.6)
  ground.receiveShadow = true
  world.add(ground)

  // Floors: each room has its own colour, brighter when you are in it
  const floors = {}
  const floorMat = {}
  const roomTint = (id, amount) => new THREE.Color(pal.floor).lerp(new THREE.Color(ROOM_COLOR[id]), amount)
  const paintFloors = () => {
    for (const id of ORDER) {
      floorMat[id] = {
        base: mat(roomTint(id, 0.12)),
        active: mat(roomTint(id, 0.42)),
      }
    }
  }
  paintFloors()
  for (const id of ORDER) {
    const r = ROOMS[id]
    const f = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, 0.06, r.z1 - r.z0), floorMat[id].base)
    f.position.set((r.x0 + r.x1) / 2, 0.03, (r.z0 + r.z1) / 2)
    f.receiveShadow = true
    f.userData.room = id
    world.add(f)
    floors[id] = f
  }

  // Ceilings: shown when walking, hidden in the overview
  const ceilings = new THREE.Group()
  for (const id of ORDER) {
    const r = ROOMS[id]
    const c = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0 - 0.2, 0.08, r.z1 - r.z0 - 0.2), M.ceiling)
    c.position.set((r.x0 + r.x1) / 2, WALL_H + 0.04, (r.z0 + r.z1) / 2)
    c.receiveShadow = true
    ceilings.add(c)
  }
  world.add(ceilings)

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
  // Doorway frames, coloured by the room you walk into
  for (const d of DOORS) {
    if (!d.b) continue
    const color = new THREE.Color(ROOM_COLOR[d.b])
    const frameMat = mat(color)
    if (d.dir === 'h') box(DOOR_W + 0.16, 0.14, WALL_T + 0.04, d.x, WALL_H - 0.12, d.z, frameMat, { solid: false })
    else box(WALL_T + 0.04, 0.14, DOOR_W + 0.16, d.x, WALL_H - 0.12, d.z, frameMat, { solid: false })
  }

  // Furniture
  const c = (id) => ({ x: (ROOMS[id].x0 + ROOMS[id].x1) / 2, z: (ROOMS[id].z0 + ROOMS[id].z1) / 2 })
  const s = c('about')
  box(1.8, 0.08, 0.8, s.x, 0.74, -3.6, M.wood)
  box(0.9, 0.5, 0.05, s.x, 1.1, -3.95, mat(0x2b2a27))
  box(0.5, 0.1, 0.5, s.x, 0.45, -2.5, mat(new THREE.Color(ROOM_COLOR.about)), { solid: false })
  box(0.9, 0.9, 0.6, -5.4, 0.45, -3.9, M.wood)
  const l = c('skills')
  box(2.2, 0.45, 0.9, l.x, 0.23, -4.0, mat(new THREE.Color(ROOM_COLOR.skills)))
  box(2.2, 0.55, 0.22, l.x, 0.6, -4.3, mat(new THREE.Color(ROOM_COLOR.skills)))
  // tables sit to the side so the doorways stay clear
  box(1.2, 0.08, 0.6, l.x - 1.0, 0.38, -2.6, M.wood)
  box(0.9, 0.04, 0.9, -1.0, 0.1, -2.6, M.rug, { solid: false, cast: false })
  const w = c('experience')
  box(3.0, 0.9, 0.8, w.x, 0.45, -4.1, M.wood)
  box(0.7, 0.6, 0.7, w.x + 1.6, 0.3, -2.6, M.wood)
  const lb = c('certifications')
  box(1.2, 2.0, 0.4, lb.x - 1.4, 1.0, -1.3, M.wood)
  box(1.2, 2.0, 0.4, lb.x + 1.4, 1.0, -1.3, M.wood)
  // book spines on the shelves
  const spines = [ROOM_COLOR.skills, ROOM_COLOR.projects, ROOM_COLOR.contact, ROOM_COLOR.experience, ROOM_COLOR.about]
  for (const sx of [lb.x - 1.4, lb.x + 1.4]) {
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 6; k++) {
        box(0.14, 0.34, 0.2, sx - 0.5 + k * 0.2, 0.55 + row * 0.6, -1.08, mat(new THREE.Color(spines[(k + row) % spines.length])), { solid: false })
      }
    }
  }
  box(1.0, 0.75, 0.6, lb.x + 1.0, 0.37, 0.4, M.wood)
  box(1.0, 0.1, 0.6, lb.x + 1.0, 0.8, 0.4, mat(0xa98e6e), { solid: false })
  // Hall: rug, welcome mat, plants by the door
  box(4.5, 0.02, 2.4, 0, 0.07, 3.0, mat(new THREE.Color(ROOM_COLOR.home).lerp(new THREE.Color(pal.rug), 0.5)), { solid: false, cast: false })
  box(1.2, 0.03, 0.5, 0, 0.08, 4.1, mat(0x8a6a4e), { solid: false, cast: false })
  for (const px of [-5.3, 5.3]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.6, 16), M.furn)
    pot.position.set(px, 0.3, 3.9)
    pot.castShadow = true
    world.add(pot)
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), M.plant)
    leaves.position.set(px, 1.0, 3.9)
    leaves.castShadow = true
    world.add(leaves)
  }
  // Porch: plants, bench
  const p = c('contact')
  box(1.6, 0.45, 0.5, p.x, 0.22, 0.4, M.wood)
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.6, 16), M.furn)
  pot.position.set(5.2, 0.3, -0.6)
  pot.castShadow = true
  world.add(pot)
  colliders.push({ minX: 4.9, maxX: 5.5, minZ: -0.9, maxZ: -0.3 })
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), M.plant)
  leaves.position.set(5.2, 0.9, -0.6)
  leaves.castShadow = true
  world.add(leaves)

  // Pendant lamps, one per room. Glowing bulbs only: point lights are too costly on phones.
  for (const id of ORDER) {
    const rc = c(id)
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 6), M.trim)
    cord.position.set(rc.x, WALL_H - 0.3, rc.z)
    world.add(cord)
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0.9 })
    )
    bulb.position.set(rc.x, WALL_H - 0.7, rc.z)
    world.add(bulb)
  }

  // Labels for pieces: cards drawn on a canvas, sharp and anisotropic
  const cardTexture = (text, sub, color, big = true) => {
    const cv = document.createElement('canvas')
    cv.width = 1024
    cv.height = 640
    const g = cv.getContext('2d')
    g.fillStyle = pal.paper
    g.fillRect(0, 0, cv.width, cv.height)
    g.fillStyle = color
    g.fillRect(0, 0, cv.width, 22)
    g.fillStyle = pal.ink
    const size = big ? 84 : 64
    g.font = `500 ${size}px Georgia, "Times New Roman", serif`
    g.textBaseline = 'top'
    const maxW = 900
    const words = text.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (g.measureText(test).width > maxW && line) {
        lines.push(line)
        line = word
      } else line = test
    }
    lines.push(line)
    lines.slice(0, 3).forEach((ln, i) => g.fillText(ln, 64, 110 + i * (size + 14)))
    if (sub) {
      g.font = '400 42px system-ui, sans-serif'
      g.globalAlpha = 0.65
      g.fillText(sub, 64, 540)
      g.globalAlpha = 1
    }
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = anisotropy
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    return tex
  }

  // Pieces: object, collider and label
  const meshes = []
  for (const piece of PIECES) {
    const title = titleOf(piece)
    const color = ROOM_COLOR[piece.room]
    const group = new THREE.Group()
    group.position.set(piece.x, piece.y || 0, piece.z)
    group.rotation.y = piece.rot
    world.add(group)
    const hit = []

    if (piece.kind === 'plinth') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), mat(new THREE.Color(color).lerp(new THREE.Color(pal.furn), 0.35)))
      top.position.y = 0.45
      top.castShadow = true
      top.receiveShadow = true
      group.add(top)
      colliders.push({ minX: piece.x - 0.25, maxX: piece.x + 0.25, minZ: piece.z - 0.25, maxZ: piece.z + 0.25 })
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.46, 0.29),
        new THREE.MeshStandardMaterial({ map: cardTexture(title, '', color, false), roughness: 0.5 })
      )
      label.position.set(0, 0.7, 0.26)
      group.add(label)
      hit.push(top, label)
    } else {
      const back = new THREE.Mesh(new THREE.BoxGeometry(piece.w + 0.08, piece.h + 0.08, 0.05), M.wood)
      back.position.z = -0.02
      back.castShadow = true
      group.add(back)
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(piece.w, piece.h),
        new THREE.MeshStandardMaterial({
          map: cardTexture(title, piece.kind === 'plaque' ? 'Click to read' : '', color),
          roughness: 0.5,
        })
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

  // Visitor: first person, with a figure in the overview
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

  // Route line on the floor
  const routeGroup = new THREE.Group()
  world.add(routeGroup)
  const routeMat = mat(0xa85a24, { emissive: 0x5a2e10, emissiveIntensity: 0.4 })
  const dotGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12)
  let routeDots = []
  const clearRoute = () => {
    for (const d of routeDots) routeGroup.remove(d)
    routeDots = []
  }
  const drawRoute = (points) => {
    clearRoute()
    for (const pt of points) {
      const d = new THREE.Mesh(dotGeo, routeMat)
      d.position.set(pt.x, 0.1, pt.z)
      routeGroup.add(d)
      routeDots.push(d)
    }
  }

  // Labels: room names (overview) and door hints (walking)
  const labelHost = $('#house-labels')
  const roomLabels = {}
  for (const id of ORDER) {
    const el = document.createElement('span')
    el.className = 'house-label house-label--room'
    el.textContent = ROOMS[id].name
    el.style.setProperty('--room', ROOM_COLOR[id])
    labelHost.appendChild(el)
    roomLabels[id] = el
  }
  const doorLabels = DOORS.filter((d) => d.b).map((d) => {
    const el = document.createElement('span')
    el.className = 'house-label house-label--door'
    labelHost.appendChild(el)
    return { door: d, el }
  })

  // Walking state
  const player = { x: 0, z: 3 }
  let yaw = 0
  let pitch = 0
  let view = 'walk'
  let path = []
  let arrive = null
  let target = null
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

  // Grid pathfinding for walking to a point
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
    // If you are standing too close to a wall to be on a free cell, start from the nearest free one
    let start = cellOf(fromX, fromZ)
    if (!cellFree(start[0], start[1])) {
      const near = nearestFree(fromX, fromZ)
      if (!near) return []
      start = near
    }
    let goal = cellOf(toX, toZ)
    if (!cellFree(goal[0], goal[1])) {
      const near = nearestFree(toX, toZ)
      if (!near) return []
      goal = near
    }
    const key = (i, j) => j * NX + i
    const h = (i, j) => Math.abs(i - goal[0]) + Math.abs(j - goal[1])
    const open = [{ i: start[0], j: start[1], g: 0, f: h(start[0], start[1]) }]
    const came = new Map()
    const gScore = new Map([[key(start[0], start[1]), 0]])
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
          out.unshift(cellPos(k % NX, Math.floor(k / NX)))
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

  function walkTo(x, z, onArrive, dest = null) {
    arrive = onArrive || null
    target = dest
    path = findPath(player.x, player.z, x, z)
    if (!path.length) {
      arrive = null
      target = null
      clearRoute()
      return false
    }
    drawRoute(path)
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
    return { x: piece.x + Math.sin(piece.rot) * STAND, z: piece.z + Math.cos(piece.rot) * STAND }
  }

  function faceTowards(x, z) {
    yaw = Math.atan2(-(x - player.x), -(z - player.z))
  }

  function visitPiece(piece) {
    const sp = standPoint(piece)
    const ok = walkTo(sp.x, sp.z, () => {
      faceTowards(piece.x, piece.z)
      openPiece(piece)
    }, ROOMS[piece.room] ? piece.room : null)
    if (!ok) {
      faceTowards(piece.x, piece.z)
      openPiece(piece)
    }
  }

  function walkToRoom(id) {
    const r = ROOMS[id]
    closePanel()
    walkTo((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, null, id)
  }

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

  const ray = new THREE.Raycaster()
  const centre = new THREE.Vector2(0, 0)
  let hinted = null
  let last = performance.now()
  let running = false
  let raf = 0
  let activeRoom = null
  const cam = { theta: 0.6, phi: 0.95, r: 20, target: new THREE.Vector3(0, 0.5, 0.6) }
  const drag = { active: false, x: 0, y: 0, moved: 0 }

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
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    const speed = reduceMotion ? SPEED * 2 : SPEED

    // Direction from keys and joystick, relative to where you look
    let fwd = (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('s') || keys.has('ArrowDown') ? 1 : 0)
    let strafe = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0)
    const jx = Math.abs(input.joy.x) > 0.12 ? input.joy.x : 0
    const jy = Math.abs(input.joy.y) > 0.12 ? input.joy.y : 0
    fwd += jy
    strafe += jx
    const len = Math.hypot(fwd, strafe)
    if (len > 0.001) {
      if (len > 1) {
        fwd /= len
        strafe /= len
      }
      path = []
      target = null
      arrive = null
      clearRoute()
      const mx = fwd * -Math.sin(yaw) + strafe * Math.cos(yaw)
      const mz = fwd * -Math.cos(yaw) + strafe * -Math.sin(yaw)
      const step = speed * dt
      const nx = player.x + mx * step
      const nz = player.z + mz * step
      if (!circleBlocked(nx, player.z)) player.x = nx
      if (!circleBlocked(player.x, nz)) player.z = nz
    }

    // Walking along a route
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
        if (routeDots.length) routeGroup.remove(routeDots.shift())
      } else {
        player.x += (dx / dist) * step
        player.z += (dz / dist) * step
        yaw = Math.atan2(-dx, -dz)
      }
      if (!path.length) clearRoute()
      if (!path.length && arrive) {
        const done = arrive
        arrive = null
        done()
      }
    }

    figure.position.set(player.x, 0, player.z)
    figure.rotation.y = yaw + Math.PI
    ceilings.visible = view === 'walk'
    updateCamera(dt)

    // Rooms: where you are, floor lights, lamps
    const here = roomAt(player.x, player.z)
    if (here && here !== activeRoom) {
      activeRoom = here
      setRoomNow(here)
      for (const id of ORDER) floors[id].material = id === here ? floorMat[id].active : floorMat[id].base
    }

    // What is in the centre of the screen
    if (view === 'walk' && !openedPiece) {
      ray.setFromCamera(centre, camera)
      const hits = ray.intersectObjects(meshes, false).filter((h) => h.distance < 3.2)
      hinted = hits.length ? hits[0].object.userData.piece : nearestPiece(1.6)
      if (hinted) {
        $hint.textContent = `Press E or click to view: ${titleOf(hinted)}`
        $hint.hidden = false
      } else $hint.hidden = true
    } else $hint.hidden = true

    // Labels
    const w = host.clientWidth
    const h = host.clientHeight
    const project = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z).project(camera)
      const behind = v.z > 1
      return { sx: (v.x * 0.5 + 0.5) * w, sy: (-v.y * 0.5 + 0.5) * h, visible: !behind && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 }
    }
    for (const id of ORDER) {
      const el = roomLabels[id]
      if (view !== 'overview') {
        el.hidden = true
        continue
      }
      const r = ROOMS[id]
      const p2 = project((r.x0 + r.x1) / 2, 0.3, (r.z0 + r.z1) / 2)
      el.hidden = !p2.visible
      el.style.transform = `translate(${p2.sx}px, ${p2.sy}px) translate(-50%, -50%)`
      el.classList.toggle('is-active', id === here)
    }
    for (const { door, el } of doorLabels) {
      // in walking mode, show the doors that lead out of the room you are in
      const relevant = view === 'walk' && here && (door.a === here || door.b === here)
      if (!relevant) {
        el.hidden = true
        continue
      }
      const other = door.a === here ? door.b : door.a
      const dist = Math.hypot(door.x - player.x, door.z - player.z)
      const p2 = project(door.x, 2.1, door.z)
      el.hidden = !p2.visible || dist > 9
      el.textContent = `Through to ${ROOMS[other].name}`
      el.style.setProperty('--room', ROOM_COLOR[other])
      el.style.transform = `translate(${p2.sx}px, ${p2.sy}px) translate(-50%, -50%)`
    }

    ui.frame({ x: player.x, z: player.z, yaw, room: here, path: path.slice(0, 40), target })
    renderer.render(world, camera)
    raf = requestAnimationFrame(frame)
  }

  const ui = {
    frame(state) {
      drawMinimap(state)
    },
  }

  // Mouse and touch on the scene
  const pick = (e) => {
    const rect = dom.getBoundingClientRect()
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    ray.setFromCamera(v, camera)
    return ray.intersectObjects([...meshes, ...Object.values(floors)], false)[0] || null
  }
  dom.addEventListener('pointerdown', (e) => {
    drag.active = true
    drag.x = e.clientX
    drag.y = e.clientY
    drag.moved = 0
    dom.setPointerCapture(e.pointerId)
  })
  dom.addEventListener('pointermove', (e) => {
    if (drag.active) {
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.moved += Math.abs(dx) + Math.abs(dy)
      drag.x = e.clientX
      drag.y = e.clientY
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
    dom.style.cursor = hit ? 'pointer' : 'grab'
  })
  dom.addEventListener('pointerup', (e) => {
    if (drag.active && drag.moved < 6) {
      const hit = pick(e)
      if (hit) closePanel()
      if (hit && hit.object.userData.piece) visitPiece(hit.object.userData.piece)
      else if (hit && hit.object.userData.room) walkTo(hit.point.x, hit.point.z, null)
    }
    drag.active = false
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
  const keyName = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key)
  document.addEventListener('keydown', (e) => keys.add(keyName(e)))
  document.addEventListener('keyup', (e) => keys.delete(keyName(e)))
  window.addEventListener('blur', () => keys.clear())

  const resize = () => {
    const w = host.clientWidth
    const h = host.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(host)

  // Theme changes repaint the scene
  new MutationObserver(() => {
    pal = PALETTE[themeKey()]
    for (const k of ['wall', 'trim', 'furn', 'wood', 'plant', 'skin', 'rug', 'figure', 'ceiling', 'ground']) {
      const map = { wall: M.wall, trim: M.trim, furn: M.furn, wood: M.wood, plant: M.plant, skin: M.skin, rug: M.rug, figure: M.figure, ceiling: M.ceiling, ground: M.ground }
      map[k].color.setHex(pal[k])
    }
    ground.material = M.ground
    paintFloors()
    for (const id of ORDER) {
      floors[id].material = floorMat[id].base
    }
    if (activeRoom) floors[activeRoom].material = floorMat[activeRoom].active
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
      clearRoute()
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
      if (view === 'overview') cam.target.set(player.x, 0.5, player.z)
      else pitch = 0
      return view === 'overview'
    },
  }
}

setRoomNow('home')
paintToggle()
