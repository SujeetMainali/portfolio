/*
  Control Center: appearance, wallpaper and sound.
  Its settings are shared with the terminal (theme, wallpaper, sound commands).
*/
(() => {
  const root = document.documentElement
  const $ = (sel, scope = document) => scope.querySelector(sel)
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)]
  const PREFS = 'desk-prefs'
  const panel = $('#cc')
  const toggle = $('#cc-toggle')
  const sound = $('#cc-sound')
  const note = $('#cc-wall-note')
  if (!panel || !toggle) return

  const WALL_NOTES = {
    auto: 'Auto follows your clock: dawn, then day, then evening.',
    dawn: 'A warm morning gradient.',
    aurora: 'A soft evening gradient.',
    topo: 'The topographic pattern from the start.',
  }

  // sound effects are on until someone turns them off
  const readPrefs = () => {
    let p = {}
    try {
      p = JSON.parse(localStorage.getItem(PREFS)) || {}
    } catch (e) {}
    if (p.sound === undefined) p.sound = true
    return p
  }
  let prefs = readPrefs()
  const save = () => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs))
    } catch (e) {}
  }

  /*===== APPEARANCE =====*/
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
  const themeChoice = () => {
    try {
      return localStorage.getItem('theme') || 'dark'
    } catch (e) {
      return 'dark'
    }
  }
  function applyTheme() {
    const choice = themeChoice()
    const resolved = choice === 'auto' ? (systemDark.matches ? 'dark' : 'light') : choice
    root.setAttribute('data-theme', resolved)
  }
  function setTheme(choice) {
    if (!['light', 'dark', 'auto'].includes(choice)) return
    try {
      localStorage.setItem('theme', choice)
    } catch (e) {}
    applyTheme()
    render()
  }
  systemDark.addEventListener('change', () => {
    if (themeChoice() === 'auto') applyTheme()
  })

  /*===== WALLPAPER =====*/
  // Auto: dawn in the morning, the topographic day, an aurora evening
  const resolveWall = (choice) => {
    if (choice !== 'auto') return choice
    const h = new Date().getHours()
    if (h >= 5 && h < 10) return 'dawn'
    if (h >= 10 && h < 18) return 'topo'
    return 'aurora'
  }
  function applyWall() {
    root.setAttribute('data-wall', resolveWall(prefs.wallpaper || 'auto'))
  }
  function setWall(choice) {
    if (!['auto', 'dawn', 'aurora', 'topo'].includes(choice)) return
    prefs.wallpaper = choice
    save()
    applyWall()
    render()
  }
  // the auto wallpaper changes with the time of day
  setInterval(() => {
    if ((prefs.wallpaper || 'auto') === 'auto') applyWall()
  }, 5 * 60 * 1000)

  /*===== SOUND =====*/
  function setSound(on) {
    prefs.sound = !!on
    save()
    render()
  }

  /*===== PANEL =====*/
  function render() {
    const choice = themeChoice()
    $$('[data-theme-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themePick === choice)))
    const wall = prefs.wallpaper || 'auto'
    $$('[data-wall-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wallPick === wall)))
    if (note) note.textContent = WALL_NOTES[wall]
    sound.setAttribute('aria-checked', String(!!prefs.sound))
    sound.classList.toggle('is-on', !!prefs.sound)
  }

  function openPanel(open) {
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    if (open) render()
  }
  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    openPanel(panel.hidden)
  })
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('#cc') && !e.target.closest('#cc-toggle')) openPanel(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) openPanel(false)
  })

  $$('[data-theme-pick]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themePick)))
  $$('[data-wall-pick]').forEach((b) => b.addEventListener('click', () => setWall(b.dataset.wallPick)))
  sound.addEventListener('click', () => setSound(!prefs.sound))

  window.control = {
    setTheme,
    setWall,
    setSound,
    prefs: () => prefs,
    refresh: () => {
      prefs = readPrefs()
      applyWall()
    },
  }

  applyTheme()
  applyWall()
  render()
})()

/*===== HOVER TEXT: a tooltip for every app, folder and dock tile =====*/
;(() => {
  const tip = document.createElement('div')
  tip.className = 'tooltip'
  tip.setAttribute('role', 'tooltip')
  document.body.appendChild(tip)
  let timer = 0
  let current = null

  // The name an app or folder shows: its label, or a tip set in the markup
  const labelFor = (el) => {
    if (el.dataset.tip) return el.dataset.tip
    const label = el.querySelector('.dock__label, .icon__label')
    return label ? label.textContent.trim() : el.textContent.trim()
  }

  function show(el) {
    const text = labelFor(el)
    if (!text) return
    tip.textContent = text
    const r = el.getBoundingClientRect()
    tip.classList.remove('is-shown')
    const w = tip.offsetWidth
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8)
    tip.style.left = `${left}px`
    tip.style.top = `${r.top - tip.offsetHeight - 8}px`
    requestAnimationFrame(() => tip.classList.add('is-shown'))
  }
  function hide() {
    clearTimeout(timer)
    current = null
    tip.classList.remove('is-shown')
  }

  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('.dock__item, .icon, .menubar__btn, .menubar__icon, [data-tip]')
    if (el === current) return
    hide()
    if (!el) return
    current = el
    timer = setTimeout(() => show(el), 350)
  })
  document.addEventListener('pointerdown', hide)
  document.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
})()

/*===== TRASH: close every open window =====*/
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-close-all]')) return
  document.querySelectorAll('.win:not([hidden]) [data-close]').forEach((btn) => btn.click())
})
