// Original: https://stackoverflow.com/a/34395548
const endsWith = (str, suffix) => {
  if (str === null || suffix === null)
    return false
  return str.indexOf(suffix, str.length - suffix.length) !== -1
}

const scriptLoader = (() => {
  function scriptLoader(files) {
    this.log = (msg) => {
      console.log(`scriptLoader: ${msg}`)
    }
    this.withNoCache = (f) => {
      if (f.indexOf("?") === -1)
        f += "?no_cache=" + Date.now()
      else
        f += "&no_cache=" + Date.now()
      return f
    }
    this.loadCss = (f) => {
      let link = document.createElement("link")
      link.rel = "stylesheet"
      link.type = "text/css"
      link.href = this.withNoCache(f)
      link.onload = () => {
        this.log(`Loaded style "${link.href}".`)
      }
      link.onerror = () => {
        this.log(`Error loading style "${link.href}".`)
      }
      this.m_head.appendChild(link)
    }
    this.loadJs = (i, cb, argv) => {
      let script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = this.withNoCache(this.m_js_files[i])
      script.onload = () => {
        this.log(`Loaded script "${script.src}".`)
        if (i < this.m_js_files.length - 1) {
          this.loadJs(i + 1, cb, argv)
        }
        else if (typeof cb == "function") {
          cb(argv)
        }
      }
      script.onerror = () => {
        this.log(`Error loading script "${script.src}".`)
      }
      this.m_head.appendChild(script)
    }
    this.loadFiles = (cb, argv) => {
      for (let i = 0; i < this.m_css_files.length; i++) {
        this.loadCss(this.m_css_files[i])
      }
      this.loadJs(0, cb, argv)
    }
    this.m_js_files = []
    this.m_css_files = []
    this.m_head = document.getElementsByTagName("head")[0]
    // this.m_head = document.head // IE9+ only
    for (let i = 0; i < files.length; i++) {
      if (endsWith(files[i], ".css")) {
        this.m_css_files.push(files[i])
      }
      else if (endsWith(files[i], ".js")) {
        this.m_js_files.push(files[i])
      }
      else {
        this.log(`Error unknown filetype "${files[i]}".`)
      }
    }
  }
  return scriptLoader
})()
