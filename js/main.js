/*===== THEME TOGGLE =====*/
const themeToggle = document.getElementById('theme-toggle')
const themeIcon = themeToggle ? themeToggle.querySelector('i') : null
const storedTheme = localStorage.getItem('theme')

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'bx bx-sun' : 'bx bx-moon'
    }
}

if (storedTheme) {
    applyTheme(storedTheme)
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark')
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
        const next = current === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        localStorage.setItem('theme', next)
    })
}

/*===== PALETTE SELECT =====*/
const paletteSelect = document.getElementById('palette-select')

if (paletteSelect) {
    paletteSelect.value = document.documentElement.getAttribute('data-palette') || 'slate-amber'

    paletteSelect.addEventListener('change', () => {
        const palette = paletteSelect.value
        document.documentElement.setAttribute('data-palette', palette)
        localStorage.setItem('palette', palette)
    })
}

/*===== MENU SHOW =====*/
const showMenu = (toggleId, navId) => {
    const toggle = document.getElementById(toggleId)
    const nav = document.getElementById(navId)

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('show')
        })
    }
}
showMenu('nav-toggle', 'nav-menu')

/*==================== REMOVE MENU MOBILE ====================*/
const navLink = document.querySelectorAll('.nav__link')

function linkAction() {
    const navMenu = document.getElementById('nav-menu')
    navMenu.classList.remove('show')
}
navLink.forEach(n => n.addEventListener('click', linkAction))

/*==================== SCROLL SECTIONS ACTIVE LINK ====================*/
const sections = document.querySelectorAll('section[id]')

function scrollActive() {
    const scrollY = window.pageYOffset

    sections.forEach(current => {
        const sectionHeight = current.offsetHeight
        const sectionTop = current.offsetTop - 80
        const sectionId = current.getAttribute('id')
        const link = document.querySelector('.nav__menu a[href*=' + sectionId + ']')

        if (!link) return

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            link.classList.add('active')
        } else {
            link.classList.remove('active')
        }
    })
}
window.addEventListener('scroll', scrollActive)

/*===== HEADER SHADOW ON SCROLL =====*/
const header = document.getElementById('header')
function headerShadow() {
    if (!header) return
    if (window.scrollY > 20) {
        header.style.boxShadow = '0 6px 20px -10px rgba(15, 23, 42, .25)'
    } else {
        header.style.boxShadow = 'none'
    }
}
window.addEventListener('scroll', headerShadow)

/*===== SCROLL REVEAL (IntersectionObserver) =====*/
const revealEls = document.querySelectorAll('[data-reveal]')

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible')
                observer.unobserve(entry.target)
            }
        })
    }, { threshold: 0.15 })

    revealEls.forEach(el => observer.observe(el))
} else {
    revealEls.forEach(el => el.classList.add('is-visible'))
}

/*===== FOOTER YEAR =====*/
const yearEl = document.getElementById('year')
if (yearEl) {
    yearEl.textContent = new Date().getFullYear()
}
