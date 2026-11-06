/*
  Sujeet Mainali portfolio. Plain JavaScript, no dependencies.
  Everything here is progressive: without JS the page is still complete.
*/
(() => {
  const root = document.documentElement
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (sel, scope = document) => scope.querySelector(sel)
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)]

  /*===== THEME =====*/
  const themeBtn = $('#theme-toggle')

  function paintThemeIcon() {
    const icon = $('i', themeBtn)
    const isDark = root.getAttribute('data-theme') === 'dark'
    icon.className = isDark ? 'bx bx-sun' : 'bx bx-moon'
    themeBtn.setAttribute('aria-pressed', String(isDark))
  }

  themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    root.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch (e) {}
    paintThemeIcon()
  })
  paintThemeIcon()

  /*===== MOBILE MENU =====*/
  const menuBtn = $('#nav-toggle')
  const menu = $('#nav-menu')

  function setMenu(open) {
    menu.classList.toggle('is-open', open)
    menuBtn.setAttribute('aria-expanded', String(open))
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
    $('i', menuBtn).className = open ? 'bx bx-x' : 'bx bx-menu'
  }

  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')))
  $$('.nav__link').forEach((link) => link.addEventListener('click', () => setMenu(false)))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false)
      menuBtn.focus()
    }
  })

  /*===== HEADER BORDER ON SCROLL =====*/
  const header = $('#header')
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  /*===== NAV: CURRENT SECTION =====*/
  const navLinks = new Map($$('.nav__link').map((a) => [a.getAttribute('href').slice(1), a]))
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          navLinks.forEach((link, id) => {
            link.setAttribute('aria-current', String(id === entry.target.id))
          })
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    navLinks.forEach((_, id) => {
      const section = document.getElementById(id)
      if (section) spy.observe(section)
    })
  }

  /*===== PROJECT STACK FILTER =====*/
  const projects = $$('.project')
  const chipsBox = $('#filter-chips')
  const countBox = $('#filter-count')

  // Count how many projects use each technology, most used first.
  const usage = new Map()
  projects.forEach((p) => {
    p.dataset.stack.split('|').forEach((tech) => usage.set(tech, (usage.get(tech) || 0) + 1))
  })
  const techs = [...usage.keys()].sort(
    (a, b) => usage.get(b) - usage.get(a) || a.localeCompare(b)
  )

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

  function setFilter(value, { scroll = false } = {}) {
    const enteringIds = []

    $$('.chip', chipsBox).forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.value === value))
    })

    let shown = 0
    projects.forEach((p) => {
      const match = value === 'All' || p.dataset.stack.split('|').includes(value)
      const wasHidden = p.hidden
      p.hidden = !match
      if (match) {
        shown++
        if (wasHidden) enteringIds.push(p)
      }
      p.classList.remove('is-entering')
    })

    // Small fade for cards that came back into view.
    if (!reduceMotion) {
      enteringIds.forEach((p) => {
        p.classList.remove('is-entering')
        void p.offsetWidth
        p.classList.add('is-entering')
      })
    }

    countBox.textContent =
      value === 'All'
        ? `Showing all ${projects.length} projects`
        : `Showing ${shown} of ${projects.length} using ${value}`

    if (scroll) goTo('projects')
  }

  chipsBox.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip')
    if (chip) setFilter(chip.dataset.value)
  })

  // Tags on a project filter the list to that technology.
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('[data-filter]')
    if (!tag) return
    setFilter(tag.dataset.filter, { scroll: false })
    goTo('projects')
  })

  setFilter('All')

  /*===== SKILLS THAT LINK TO PROJECTS =====*/
  const used = new Set(techs)
  $$('.skill-tag').forEach((tag) => {
    const name = tag.textContent.trim()
    if (!used.has(name)) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tag tag--link'
    btn.textContent = name
    btn.title = `Show projects built with ${name}`
    btn.addEventListener('click', () => setFilter(name, { scroll: true }))
    tag.replaceWith(btn)
  })

  /*===== COUNT-UP FIGURES =====*/
  const counters = $$('[data-count]')

  function countUp(el) {
    const target = Number(el.dataset.count)
    const suffix = el.dataset.suffix || ''
    if (reduceMotion) {
      el.textContent = target + suffix
      return
    }
    const duration = 900
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      el.textContent = Math.round(target * eased) + suffix
      if (t < 1) requestAnimationFrame(tick)
    }
    el.textContent = '0' + suffix
    requestAnimationFrame(tick)
  }

  /*===== SCROLL REVEAL =====*/
  const revealEls = $$('[data-reveal]')

  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target
          el.classList.add('is-visible')
          reveal.unobserve(el)
          el.querySelectorAll('[data-count]').forEach(countUp)
        })
      },
      { threshold: 0.15 }
    )
    revealEls.forEach((el) => reveal.observe(el))
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'))
    counters.forEach((el) => {
      el.textContent = el.dataset.count + (el.dataset.suffix || '')
    })
  }

  /*===== COPY EMAIL =====*/
  const copyBtn = $('#copy-email')
  const EMAIL = 'mainalisujeet@gmail.com'

  if (copyBtn) {
    const label = $('span', copyBtn)
    const icon = $('i', copyBtn)
    let resetTimer = null

    function flash(text, icoClass, done) {
      label.textContent = text
      icon.className = icoClass
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

  /*===== GO TO A SECTION =====*/
// Scrolls to a section, or walks to its room when the house is open (see house.js).
function goTo(id) {
  if (window.houseWalk && window.houseWalk.active()) {
    window.houseWalk.goTo(id)
    return
  }
  document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

/*===== FOOTER YEAR =====*/
  const year = document.getElementById('year')
  if (year) year.textContent = new Date().getFullYear()
})()
