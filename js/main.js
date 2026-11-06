/*
  Sujeet Mainali portfolio, as a desktop.
  Plain JavaScript, no dependencies. Every section opens as a window.
  Without JavaScript the sections are still there, just closed.
*/
(() => {
  const root = document.documentElement
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isNarrow = () => window.matchMedia('(max-width: 720px)').matches
  const $ = (sel, scope = document) => scope.querySelector(sel)
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)]

  /*===== THEME =====*/
  // Appearance and wallpaper live in the Control Center (js/control.js)

  /*===== CLOCK =====*/
  const clock = $('#clock')
  const clockFormat = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const clockShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const tickClock = () => {
    const narrow = window.matchMedia('(max-width: 720px)').matches
    clock.textContent = (narrow ? clockShort : clockFormat).format(new Date())
  }
  tickClock()
  setInterval(tickClock, 15000)

  /*===== WINDOWS =====*/
  const wins = new Map($$('.win').map((w) => [w.dataset.win, w]))
  const dockItems = (id) => $$(`.dock__item[data-open="${id}"]`)
  const running = new Set() // windows that are open, even if minimised
  let zTop = 20
  let placed = 0

  function placeWindow(el) {
    if (isNarrow()) return
    const n = placed++ % 6
    const desk = $('#desktop').getBoundingClientRect()
    const left = 96 + n * 30
    // keep the whole window on screen, above the dock
    const top = Math.min(64 + n * 26, Math.max(12, desk.height - el.offsetHeight - 100))
    el.style.left = `${Math.min(left, Math.max(8, desk.width - el.offsetWidth - 8))}px`
    el.style.top = `${top}px`
  }

  function focusWindow(el) {
    zTop += 1
    el.style.zIndex = zTop
    wins.forEach((w) => w.classList.toggle('is-active', w === el))
  }

  function paintRunning() {
    wins.forEach((el, id) => {
      dockItems(id).forEach((item) => item.classList.toggle('is-running', running.has(id)))
    })
  }

  // Let other scripts (the walkthrough) know a window opened or closed
  function announce(type, id) {
    document.dispatchEvent(new CustomEvent(type, { detail: id }))
  }

  function open(id) {
    const el = wins.get(id)
    if (!el) return
    if (el.hidden) {
      el.hidden = false
      if (!el.dataset.placed) {
        placeWindow(el)
        el.dataset.placed = '1'
      }
    }
    running.add(id)
    focusWindow(el)
    paintRunning()
    if (id === 'terminal') setTimeout(() => $('#term-input').focus(), 0)
    announce('desktop:open', id)
  }

  function close(id) {
    const el = wins.get(id)
    if (!el || el.hidden) return
    el.hidden = true
    el.classList.remove('win--max')
    running.delete(id)
    paintRunning()
    announce('desktop:close', id)
  }

  // Keep a window's position on screen when the viewport shrinks
  window.addEventListener('resize', () => {
    wins.forEach((el) => {
      if (el.hidden || isNarrow()) return
      const rect = el.getBoundingClientRect()
      const desk = $('#desktop').getBoundingClientRect()
      if (rect.right > desk.right) el.style.left = `${Math.max(8, desk.width - rect.width - 8)}px`
      if (rect.bottom > desk.bottom) el.style.top = `${Math.max(8, desk.height - rect.height - 8)}px`
    })
  })

  // Clicks that open a window: icons, dock, menu bar, buttons inside sections
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open]')
    if (trigger) {
      e.preventDefault()
      open(trigger.dataset.open)
    }
  })

  // Window controls and focus
  wins.forEach((el, id) => {
    el.addEventListener('pointerdown', () => focusWindow(el))
    $('[data-close]', el).addEventListener('click', () => close(id))
    $('[data-min]', el).addEventListener('click', () => {
      // minimised: hidden, but still running (the dock keeps a dot)
      el.hidden = true
      paintRunning()
      announce('desktop:close', id)
    })
    $('[data-max]', el).addEventListener('click', () => {
      el.classList.toggle('win--max')
      focusWindow(el)
    })
  })

  // Dragging a window by its title bar
  let drag = null
  document.addEventListener('pointerdown', (e) => {
    const bar = e.target.closest('[data-drag]')
    if (!bar || e.target.closest('.light') || isNarrow()) return
    const el = bar.closest('.win')
    if (!el || el.classList.contains('win--max')) return
    const rect = el.getBoundingClientRect()
    drag = { el, dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    bar.setPointerCapture(e.pointerId)
  })
  document.addEventListener('pointermove', (e) => {
    if (!drag) return
    const desk = $('#desktop').getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX - drag.dx - desk.left, -drag.el.offsetWidth + 80), desk.width - 80)
    const y = Math.min(Math.max(e.clientY - drag.dy - desk.top, 0), desk.height - 40)
    drag.el.style.left = `${x}px`
    drag.el.style.top = `${y}px`
  })
  document.addEventListener('pointerup', () => {
    drag = null
  })

  /*===== REVEAL COUNTERS WHEN A WINDOW SHOWS =====*/
  const countUp = (el) => {
    const target = Number(el.dataset.count)
    const suffix = el.dataset.suffix || ''
    if (reduceMotion) {
      el.textContent = target + suffix
      return
    }
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / 900, 1)
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix
      if (t < 1) requestAnimationFrame(tick)
    }
    el.textContent = '0' + suffix
    requestAnimationFrame(tick)
  }
  if ('IntersectionObserver' in window) {
    const counters = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        countUp(entry.target)
        counters.unobserve(entry.target)
      })
    })
    $$('[data-count]').forEach((el) => counters.observe(el))
  }

  /*===== GO TO A SECTION =====*/
  // Section ids are the same as their windows, except the Read Me window.
  const windowFor = (id) => (id === 'home' ? 'welcome' : id)

  // Opens a section's window, or walks to its room when the walkthrough is open
  function goTo(id) {
    if (window.houseWalk && window.houseWalk.active()) {
      window.houseWalk.goTo(id)
      return
    }
    open(windowFor(id))
  }

  // The walkthrough asks for a window to show, for example when the house is unavailable
  document.addEventListener('desktop:request', (e) => open(e.detail))
  document.addEventListener('desktop:request-close', (e) => close(e.detail))

  /*===== PROJECT FILTER =====*/
  const projects = $$('.pfolder')
  const chipsBox = $('#filter-chips')
  const countBox = $('#filter-count')

  // Count how many projects use each technology, most used first
  const usage = new Map()
  projects.forEach((p) => {
    p.dataset.stack.split('|').forEach((tech) => usage.set(tech, (usage.get(tech) || 0) + 1))
  })
  const techs = [...usage.keys()].sort((a, b) => usage.get(b) - usage.get(a) || a.localeCompare(b))

  function makeChip(value, label) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'chip'
    chip.dataset.value = value
    chip.textContent = label
    chip.setAttribute('aria-pressed', 'false')
    return chip
  }

  chipsBox.appendChild(makeChip('All', 'All'))
  techs.forEach((tech) => chipsBox.appendChild(makeChip(tech, tech)))

  function setFilter(value) {
    $$('.chip', chipsBox).forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.value === value)))
    let shown = 0
    projects.forEach((p) => {
      const match = value === 'All' || p.dataset.stack.split('|').includes(value)
      const wasHidden = p.hidden
      p.hidden = !match
      if (match) shown++
      p.classList.remove('is-entering')
      if (match && wasHidden && !reduceMotion) {
        void p.offsetWidth
        p.classList.add('is-entering')
      }
    })
    countBox.textContent =
      value === 'All' ? `Showing all ${projects.length} projects` : `Showing ${shown} of ${projects.length} using ${value}`
  }

  chipsBox.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip')
    if (chip) setFilter(chip.dataset.value)
  })

  // A tag on a project filters the list to that technology
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('[data-filter]')
    if (!tag) return
    setFilter(tag.dataset.filter)
    open('projects')
  })

  setFilter('All')

  /*===== SKILLS THAT OPEN PROJECTS =====*/
  const used = new Set(techs)
  $$('.skill-tag').forEach((tag) => {
    const name = tag.textContent.trim()
    if (!used.has(name)) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tag tag--link'
    btn.textContent = name
    btn.title = `Show projects built with ${name}`
    btn.addEventListener('click', () => {
      setFilter(name)
      open('projects')
    })
    tag.replaceWith(btn)
  })

  /*===== COPY EMAIL =====*/
  const copyBtn = $('#copy-email')
  const EMAIL = 'mainalisujeet@gmail.com'
  if (copyBtn) {
    const label = $('span', copyBtn)
    const icon = $('i', copyBtn)
    let resetTimer = null

    const flash = (text, iconClass, done) => {
      label.textContent = text
      icon.className = iconClass
      copyBtn.classList.toggle('is-done', done)
      clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        label.textContent = 'Copy email'
        icon.className = 'bx bx-copy'
        copyBtn.classList.remove('is-done')
      }, 1800)
    }

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(EMAIL)
        flash('Copied', 'bx bx-check', true)
      } catch (e) {
        flash('Copy failed', 'bx bx-error-circle', false)
      }
    })
  }

  /*===== DESKTOP ICONS: laid out in columns, draggable, positions remembered =====*/
  const deskEl = $('#desktop')
  const icons = $$('.icon')
  const ICON_KEY = 'desk-icons'
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(ICON_KEY)) || {}
  } catch (e) {}
  let suppressClick = false

  function layoutIcons() {
    const desk = deskEl.getBoundingClientRect()
    const narrow = isNarrow()
    const colW = narrow ? 96 : 112
    const rowH = narrow ? 92 : 104
    const isProject = (el) => el.dataset.open.indexOf('proj-') === 0
    const place = (el, x, y) => {
      const pos = !narrow && saved[el.dataset.open]
      el.style.left = `${pos ? pos[0] : x}px`
      el.style.top = `${pos ? pos[1] : y}px`
    }
    if (narrow) {
      // phones: a tidy grid of three columns under the headline
      const cols = 3
      const colW = (desk.width - 28) / cols
      icons.forEach((el, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        el.style.left = `${14 + col * colW + (colW - el.offsetWidth) / 2}px`
        el.style.top = `${210 + row * 112}px`
      })
      return
    }
    // documents and folders in two columns on the left, below the sticky note
    const top = narrow ? 150 : 320
    icons
      .filter((el) => !isProject(el))
      .forEach((el, i) => place(el, 20 + Math.floor(i / 3) * 110, top + (i % 3) * rowH))
    // one folder per project on the right
    icons.filter(isProject).forEach((el, i) => place(el, Math.max(8, desk.width - colW), 20 + i * rowH))
  }
  layoutIcons()
  window.addEventListener('resize', layoutIcons)

  const clampTo = (v, max) => Math.min(Math.max(v, 0), Math.max(0, max))
  let iconDrag = null
  icons.forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      // on touch screens a finger on an icon scrolls the desktop; a tap still opens it
      if (e.button !== 0 || e.pointerType === 'touch') return
      suppressClick = false
      const r = el.getBoundingClientRect()
      iconDrag = { el, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moving: false }
      el.setPointerCapture(e.pointerId)
    })
    el.addEventListener('pointermove', (e) => {
      if (!iconDrag || iconDrag.el !== el) return
      if (!iconDrag.moving && Math.hypot(e.clientX - iconDrag.x0, e.clientY - iconDrag.y0) < 5) return
      iconDrag.moving = true
      el.classList.add('is-dragging')
      const desk = deskEl.getBoundingClientRect()
      el.style.left = `${clampTo(e.clientX - iconDrag.dx - desk.left, desk.width - el.offsetWidth)}px`
      el.style.top = `${clampTo(e.clientY - iconDrag.dy - desk.top, desk.height - el.offsetHeight)}px`
    })
    el.addEventListener('pointerup', () => {
      if (!iconDrag || iconDrag.el !== el) return
      if (iconDrag.moving) {
        suppressClick = true
        saved[el.dataset.open] = [parseFloat(el.style.left), parseFloat(el.style.top)]
        try {
          localStorage.setItem(ICON_KEY, JSON.stringify(saved))
        } catch (err) {}
        el.classList.remove('is-dragging')
      }
      iconDrag = null
    })
  })

  // A drag ends the click, so moving a folder does not also open it
  document.addEventListener(
    'click',
    (e) => {
      if (suppressClick && e.target.closest('.icon')) {
        e.stopPropagation()
        e.preventDefault()
        suppressClick = false
      }
    },
    true
  )

  // Helpers for the terminal (js/terminal.js)
  window.desk = {
    open,
    close,
    setFilter,
    arrange() {
      try {
        localStorage.removeItem(ICON_KEY)
      } catch (err) {}
      saved = {}
      layoutIcons()
    },
  }

  /*===== START =====*/
  // Start on a clean desktop, as the reference does; open things from the icons or dock
  paintRunning()
})()
