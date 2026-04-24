const stdout = {
  str: '',
  toString: () => {
    return stdout.str
  }
}

const endl = () => '<br/>'

const print = (str) => {
  stdout.str += str
}

const println = (str) => {
  stdout.str += str + endl()
}

const flush = () => {
  stdout.str = ''
}

const rand = () => {
  let arr = new Uint32Array(1)
  window.crypto.getRandomValues(arr)
  return arr[0]
}

const randBytes = (len) => {
  if (len <= 0)
    return
  let arr = new Uint8Array(len)
  window.crypto.getRandomValues(arr)
  return Array.from(arr)
}

const FILE = (() => {
  function FILE() {
    this.buffer = []
    this.write = (obj) => {
      if (typeof obj == 'string') {
        obj = obj.split('').map(function (i) {
          return i.charCodeAt(0);
        })
      }
      if (Array.isArray(obj))
        this.buffer = this.buffer.concat(obj)
      else
        this.buffer.push(obj)
    }
    this.read = () => this.buffer
    this.saveAs = (filename) => {
      let arr = new Uint8Array(this.buffer)
      let b = new Blob([arr], { type: "application/octet-stream" })
      let url = window.URL.createObjectURL(b)
      let a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.style = 'display: none'
      a.click()
      setTimeout(() => {
        // For Firefox it is necessary to delay revoking the ObjectURL
        window.URL.revokeObjectURL(url);
      }, 100)
      a.remove()
    }
  }
  return FILE
})()
