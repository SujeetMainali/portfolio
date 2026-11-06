/*
  The Terminal window. Commands read the page's own content, so the
  terminal and the windows always say the same things.
  Loaded after main.js, which exposes window.desk.
*/
(() => {
  const $ = (sel, scope = document) => scope.querySelector(sel)
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)]
  const desk = window.desk || {}
  const out = $('#term-out')
  const form = $('#term-form')
  const input = $('#term-input')
  const PREFS = 'desk-prefs'
  if (!out || !form || !input) return

  const prefs = (() => {
    try {
      return JSON.parse(localStorage.getItem(PREFS)) || {}
    } catch (e) {
      return {}
    }
  })()
  const savePrefs = () => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs))
    } catch (e) {}
  }

  const history = []
  let historyAt = -1
  const started = new Date()

  const line = (text = '', cls = '') => {
    const div = document.createElement('div')
    if (cls) div.className = cls
    div.textContent = text
    out.appendChild(div)
    out.scrollTop = out.scrollHeight
  }
  const texts = (sel, scope = document) => $$(sel, scope).map((el) => el.textContent.trim())
  const clean = (s) => s.replace(/\s+/g, ' ').trim()

  /*===== WHAT IS IN THE FOLDER =====*/
  const projects = $$('.pfolder')
  const projectTitle = (i) => clean($('.pfolder__label', projects[i]).textContent).replace(/^Project \d+ \(|\)$/g, '')
  const projectSlugs = {
    cisoadapt: 0,
    jobsflow: 1,
    mypalika: 2,
    servicedelivery: 2,
    kishan: 3,
    connectkisan: 3,
    kisan: 4,
    bazar: 4,
    worksheet: 5,
  }
  const files = {
    'about.md': () => [clean(texts('#about .about__lead')[0] || '')].concat(texts('#about .about__body p').map((t) => clean(t))),
    'skills.txt': () =>
      $$('#skills .skill-group').flatMap((g) => [
        clean($('.skill-group__title', g).textContent),
        '  ' + texts('.skill-tag, .tag--link', g).join(', '),
      ]),
    'experience.md': () =>
      $$('#experience .job').flatMap((job) => [
        `${clean($('.job__role', job).textContent)} · ${clean($('.job__company', job).textContent)}`,
        `  ${clean($('.job__when', job).textContent)}`,
        ...texts('li', job).map((t) => '  - ' + t),
      ]),
    'certifications.md': () => texts('.cert__title').map((t) => '- ' + t),
    'contact.vcf': () => [
      'FN:Sujeet Mainali',
      'EMAIL:mainalisujeet@gmail.com',
      'URL:linkedin.com/in/sujeetmainali',
      'URL:github.com/sujeetmainali',
    ],
    'README': () => [
      'Sujeet Mainali · Full-Stack Developer & Senior Software Engineer',
      'Try: ls, cat about.md, open projects, help',
    ],
  }
  const folderNames = ['about.md', 'skills.txt', 'experience.md', 'certifications.md', 'contact.vcf', 'README']

  /*===== OPENING THINGS =====*/
  const windows = {
    welcome: ['welcome', 'readme', 'read'],
    about: ['about', 'about.md', 'aboutme'],
    skills: ['skills', 'skills.txt'],
    experience: ['experience', 'experience.md', 'work'],
    projects: ['projects', 'project', 'finder'],
    certifications: ['certifications', 'certifications.md', 'certs'],
    contact: ['contact', 'socials', 'socials.vcf'],
    house: ['house', 'walkthrough', 'walk'],
    terminal: ['terminal', 'shell'],
  }
  function openTarget(name) {
    const key = name.toLowerCase()
    const slug = key.replace(/[^a-z]/g, '')
    if (Object.prototype.hasOwnProperty.call(projectSlugs, slug)) {
      desk.open && desk.open(`proj-${projectSlugs[slug]}`)
      return `Opened ${projectTitle(projectSlugs[slug])}.`
    }
    for (const [id, names] of Object.entries(windows)) {
      if (names.includes(key)) {
        desk.open && desk.open(id)
        return `Opened ${id === 'house' ? 'the walkthrough' : id}.`
      }
    }
    return null
  }

  /*===== COMMANDS =====*/
  const commands = {
    help() {
      line('Available commands  (click one, or type it)', 'ok')
      const rows = [
        ['help', 'list available commands'],
        ['whoami', 'the short version'],
        ['ls [projects]', 'list what’s here'],
        ['cat <file>', 'print a file'],
        ['projects', 'what I’ve built'],
        ['open <name>', 'open a project or app on the desktop'],
        ['skills', 'the stack, grouped'],
        ['experience', 'where I’ve worked'],
        ['contact', 'how to reach me'],
        ['resume', 'open my resume'],
        ['now', 'what I’m up to'],
        ['neofetch', 'system info, but it’s me'],
        ['arrange', 'tidy up the desktop icons'],
        ['wallpaper [topo|dawn|aurora|auto]', 'change the desktop wallpaper'],
        ['theme [light|dark|auto]', 'light, dark or automatic appearance'],
        ['sound [on|off]', 'turn the click sounds on or off'],
        ['reboot', 'restart the desktop'],
        ['history', 'commands you’ve run'],
        ['date', 'print the date'],
        ['echo <text>', 'print text'],
        ['clear', 'clear the screen'],
        ['exit', 'close the terminal'],
      ]
      rows.forEach(([cmd, desc]) => line(`${cmd.padEnd(30)}${desc}`))
      line('')
      line('Tips: Tab completes, ↑/↓ browse history, Ctrl+L clears.', 'muted')
    },
    whoami() {
      line('Sujeet Mainali')
      line('Full-Stack Developer & Senior Software Engineer. 4+ years building web apps end-to-end.', 'muted')
    },
    ls(args) {
      if (args[0] === 'projects' || args[0] === 'projects/') {
        projects.forEach((_, i) => line(`${String(i + 1).padStart(2, '0')}  ${projectTitle(i)}`))
        return
      }
      if (args.length) {
        line(`ls: ${args[0]}: No such folder. Try: ls projects`, 'muted')
        return
      }
      line(folderNames.map((f) => f).join('   ') + '   projects/')
    },
    cat(args) {
      const name = args[0]
      if (!name) return line('cat: which file? Try: ls', 'muted')
      const get = files[name] || files[name.replace(/^\.\//, '')]
      if (!get) return line(`cat: ${name}: No such file or directory`, 'muted')
      get().forEach((t) => line(t))
    },
    projects() {
      projects.forEach((_, i) => line(`- ${projectTitle(i)}`))
      line('Open one with: open cisoadapt  (or any name from ls projects)', 'muted')
    },
    open(args) {
      if (!args.length) return line('open: what should I open? Try: open projects', 'muted')
      const msg = openTarget(args.join(' '))
      line(msg || `open: ${args.join(' ')}: nothing by that name. Try: help`, msg ? 'ok' : 'muted')
    },
    skills() {
      commands.cat(['skills.txt'])
    },
    experience() {
      commands.cat(['experience.md'])
    },
    contact() {
      line('mainalisujeet@gmail.com', 'ok')
      line('linkedin.com/in/sujeetmainali', 'muted')
      line('github.com/sujeetmainali', 'muted')
    },
    resume() {
      line('My resume isn’t attached to this site yet.', 'muted')
      line('Email mainalisujeet@gmail.com and I’ll send it over.', 'muted')
    },
    now() {
      const role = texts('#experience .job')[0]
      line('Senior Software Engineer at Cyberensic.ai, since Jul 2026.', 'ok')
      line('Designing end-to-end features and driving product optimization.', 'muted')
      if (role) line('Also: exploring the walkthrough. Type walk.', 'muted')
    },
    neofetch() {
      const rows = [
        ['OS', 'Portfolio 1.0'],
        ['Host', 'Sujeet Mainali'],
        ['Role', 'Senior Software Engineer'],
        ['Experience', '4+ years'],
        ['Companies', '3'],
        ['Projects', String(projects.length)],
        ['Stack', 'TypeScript, React, Next.js, Node.js, AWS'],
        ['Shell', 'zsh'],
        ['Mood', 'shipping'],
      ]
      rows.forEach(([k, v]) => line(`${k.padEnd(12)}${v}`))
    },
    arrange() {
      if (desk.arrange) desk.arrange()
      line('Desktop icons tidied.', 'ok')
    },
    wallpaper(args) {
      const choice = (args[0] || '').toLowerCase()
      const names = ['topo', 'dawn', 'aurora', 'auto']
      if (!names.includes(choice)) return line('wallpaper: ' + names.join(', '), 'muted')
      if (window.control) window.control.setWall(choice)
      line(`Wallpaper set to ${choice}.`, 'ok')
    },
    theme(args) {
      const choice = (args[0] || '').toLowerCase()
      if (!['light', 'dark', 'auto'].includes(choice)) return line('theme: light, dark or auto', 'muted')
      if (window.control) window.control.setTheme(choice)
      line(`Theme set to ${choice}.`, 'ok')
    },
    sound(args) {
      const choice = (args[0] || '').toLowerCase()
      const on = window.control ? window.control.prefs().sound : false
      if (!['on', 'off'].includes(choice)) return line(`sound is ${on ? 'on' : 'off'}. Use: sound on|off`, 'muted')
      if (window.control) window.control.setSound(choice === 'on')
      line(`Click sounds ${choice}.`, 'ok')
      if (choice === 'on') click()
    },
    reboot() {
      line('Restarting the desktop…', 'muted')
      setTimeout(() => {
        try {
          localStorage.removeItem('desk-icons')
        } catch (e) {}
        window.location.reload()
      }, 500)
    },
    history() {
      if (!history.length) return line('No commands yet.', 'muted')
      ;[...history].reverse().forEach((cmd, i) => line(`${String(i + 1).padStart(4)}  ${cmd}`))
    },
    date() {
      line(new Date().toString())
    },
    echo(args) {
      line(args.join(' '))
    },
    clear() {
      out.textContent = ''
    },
    exit() {
      if (desk.close) desk.close('terminal')
    },
    walk() {
      openTarget('walkthrough')
    },
  }

  /*===== SOUND: a soft click on open, a lower one on close =====*/
  let audio = null
  function click(freq = 880) {
    const on = window.control ? window.control.prefs().sound : prefs.sound !== false
    if (!on) return
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)()
      if (audio.state === 'suspended') audio.resume()
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.05, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.06)
      osc.connect(gain).connect(audio.destination)
      osc.start()
      osc.stop(audio.currentTime + 0.07)
    } catch (e) {}
  }
  document.addEventListener('desktop:open', () => click(880))
  document.addEventListener('desktop:close', () => click(620))

  /*===== RUNNING A COMMAND =====*/
  function run(raw) {
    const text = raw.trim()
    if (!text) return
    history.push(text)
    historyAt = -1
    line(`sujeet@portfolio ~ % ${text}`, 'muted')
    const [cmd, ...args] = text.split(/\s+/)
    const fn = commands[cmd.toLowerCase()]
    if (!fn) line(`zsh: command not found: ${cmd}. Type help to see what you can do.`, 'muted')
    else fn(args)
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    run(input.value)
    input.value = ''
  })

  // Tab completes command names, file names and project names
  // What can follow each command, so Tab only offers what makes sense there
  const argPools = {
    cat: () => folderNames,
    ls: () => ['projects'],
    open: () => [...Object.keys(windows), ...Object.keys(projectSlugs)],
    theme: () => ['light', 'dark', 'auto'],
    sound: () => ['on', 'off'],
    wallpaper: () => ['topo', 'dawn', 'aurora', 'auto'],
  }
  const completions = (parts) => {
    const word = parts[parts.length - 1]
    const pool = parts.length === 1 ? Object.keys(commands) : (argPools[parts[0]] || (() => []))()
    return pool.filter((p) => p.toLowerCase().startsWith(word.toLowerCase()))
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault()
      historyAt = Math.min(historyAt + 1, history.length - 1)
      input.value = history[history.length - 1 - historyAt]
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      historyAt = Math.max(historyAt - 1, -1)
      input.value = historyAt === -1 ? '' : history[history.length - 1 - historyAt]
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const parts = input.value.split(/\s+/)
      const matches = completions(parts)
      if (matches.length === 1) {
        parts[parts.length - 1] = matches[0]
        input.value = parts.join(' ') + (parts.length === 1 ? ' ' : '')
      } else if (matches.length > 1) {
        line(matches.join('   '), 'muted')
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      out.textContent = ''
    }
  })

  // Greeting when the terminal first opens
  let greeted = false
  document.addEventListener('desktop:open', (e) => {
    if (e.detail !== 'terminal' || greeted) return
    greeted = true
    line(`Last login: ${started.toDateString()} on ttys001`, 'muted')
    line('Welcome! Type help to get started, or whoami for the short version.', 'ok')
  })

})()
