// Helper functions
function toHexString8(value) {
  return ('00' + value.toString(16)).slice(-2)
}

function hex2bytes(str) {
  let ret = []
  for (let i = 0; i < str.length / 2; i++) {
    ret.push(parseInt(str.substring(2 * i, 2 * i + 2), 16))
  }
  return ret
}

function bytes2hex(bytes, space, numPerLine) {
  let str = ''
  for (let i = 0; i < bytes.length - 1; i++) {
    str += toHexString8(bytes[i])
    if (space)
      str += space
    if (i % numPerLine == numPerLine - 1)
      str += endl()
  }
  str += toHexString8(bytes[bytes.length - 1])
  return str
}

function toBytes8(value) {
  return [value & 0xff]
}

function fromBytes8(arr) {
  return arr[0]
}

function toBytes16(value) {
  return [(value >> 8) & 0xff, value & 0xff]
}

function fromBytes16(arr) {
  return (arr[0] << 8) | arr[1]
}

function toBytes32(value) {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

function fromBytes32(arr) {
  return (arr[0] << 24) | (arr[1] << 16) | (arr[2] << 8) | arr[3]
}

function dot2num(dot) {
  let d = dot.split('.')
  return ((((((+d[0]) << 8) + (+d[1])) << 8) + (+d[2])) << 8) + (+d[3])
}

function num2dot(num) {
  let d = num & 0xff;
  for (let i = 3; i > 0; i--) {
    num = num >> 8
    d = (num & 0xff) + '.' + d
  }
  return d;
}

function mac2bytes(mac) {
  let m = mac.split(':')
  let bytes = [0, 0, 0, 0, 0, 0]
  for (let i = 0; i < 6; i++) {
    if (i < m.length)
      bytes[i] = parseInt(m[i], 16)
  }
  return bytes
}

function bytes2mac(bytes) {
  let str = ''
  for (let i = 0; i < 5; i++) {
    str += (i < bytes.length) ? toHexString8(bytes[i]) : '00' + ':'
  }
  str += (5 < bytes.length) ? toHexString8(bytes[5]) : '00'
  return str
}

function rfc1071_csum(arr, { init = 0, pre_csum = 0xffff } = {}) {
  let sum = init + ((~pre_csum) & 0xffff)
  let i = 0
  for (i = 0; i < arr.length / 2; i++) {
    let word16 = (arr[2 * i] << 8) | arr[2 * i + 1]
    sum += word16
  }
  if (2 * i < arr.length) {
    sum += arr[i] << 8
  }
  while (sum >> 16) {
    sum = (sum & 0xffff) + (sum >> 16)
  }
  return (~sum) & 0xffff
}

// Ethernet header
function Ether({
  source = '00:00:00:00:00:00',
  dest = '00:00:00:00:00:00',
  eth_type = 0,
  vlanid = 0,
  pcp = 0,
  dei = false
} = {}) {
  this.source = source
  this.dest = dest
  this.eth_type = eth_type
  this.vlanid = vlanid
  this.pcp = pcp
  this.dei = dei
  this.fromBytes = (arr) => {
    this.dest = bytes2mac(arr.slice(0, 6))
    this.source = bytes2mac(arr.slice(6, 12))
    let eth_type = fromBytes16(arr.slice(12, 14))
    if (eth_type == 0x8100) {
      this.dei = !!(arr[15] >> 4)
      this.pcp = arr[15] >> 5
      this.vlanid = ((arr[15] & 0xf) << 8) | arr[16]
      eth_type = fromBytes16(arr.slice(17))
    }
    this.eth_type = eth_type
    return this
  }
  this.toBytes = () => {
    let bytes = []
    bytes = bytes.concat(
      mac2bytes(this.dest),
      mac2bytes(this.source)
    )
    if (vlanid) {
      bytes = bytes.concat(
        toBytes16(0x8100),
        toBytes8((this.pcp & 0x7) << 13 | (Number(this.dei) << 12) | ((this.vlanid >> 8) & 0xff)),
        toBytes8(this.vlanid & 0xff)
      )
    }
    bytes = bytes.concat(toBytes16(this.eth_type))
    return bytes
  }
  this.headerLen = () => 14 + ((vlanid) ? 4 : 0)
  this.toString = () => bytes2hex(this.toBytes())
}

// IPv4 header
function IPv4({
  dscp = 0, ecn = 0, total_len = 0,
  id = 0, mf = false, df = false, frag_offset = 0,
  ttl = 0, protocol = 0, checksum = 0,
  source = '0.0.0.0', dest = '0.0.0.0',
  options = []
} = {}) {
  this.dscp = dscp
  this.ecn = ecn
  this.total_len = total_len
  this.id = id
  this.mf = mf
  this.df = df
  this.frag_offset = frag_offset
  this.ttl = ttl
  this.protocol = protocol
  this.checksum = checksum
  this.source = source
  this.dest = dest
  this.options = options
  this.pseudoHeader = (len) => {
    let bytes = []
    bytes = bytes.concat(
      toBytes32(dot2num(this.source)),
      toBytes32(dot2num(this.dest)),
      toBytes16(this.protocol), toBytes16(len)
    )
    return bytes
  }
  this.fromBytes = (arr) => {
    this.ihl = arr[0] & 0xf
    this.dscp = arr[1] >> 2
    this.ecn = arr[1] & 0x3
    this.total_len = fromBytes16(arr.slice(2, 4))
    this.id = fromBytes16(arr.slice(4, 6))
    this.mf = !!(arr[6] & 0x20)
    this.df = !!(arr[6] & 0x40)
    this.frag_offset = fromBytes16(arr.slice(6, 8)) & 0x1fff
    this.ttl = arr[8]
    this.protocol = arr[9]
    this.checksum = fromBytes16(arr.slice(10, 12))
    this.source = num2dot(fromBytes32(arr.slice(12, 16)))
    this.dest = num2dot(fromBytes32(arr.slice(16, 20)))
    this.options = arr.slice(20, this.ihl * 4)
    return this
  }
  this.toBytes = () => {
    let bytes = [0x40 | (this.ihl & 0xf)]
    this.ihl = 5 + this.options.length / 4
    bytes = bytes.concat(
      toBytes8((this.dscp << 2) | (ecn & 3)), toBytes16(this.total_len),
      toBytes16(this.id), toBytes16(Number((this.df) << 14) | (Number(this.mf) << 13) | (this.frag_offset & 0x1fff)),
      toBytes8(this.ttl), toBytes8(this.protocol), toBytes16(this.checksum),
      toBytes32(dot2num(this.source)),
      toBytes32(dot2num(this.dest)),
      this.options
    )
    return bytes
  }
  this.headerLen = () => {
    this.ihl = 5 + this.options.length / 4
    return this.ihl * 4
  }
  this.toString = () => bytes2hex(this.toBytes())
}

// UDP header
function UDP({
  source = 0, dest = 0,
  len = 0, checksum = 0
} = {}) {
  this.source = source
  this.dest = dest
  this.len = len
  this.checksum = checksum
  this.fromBytes = (arr) => {
    this.source = fromBytes16(arr.slice(0, 2))
    this.dest = fromBytes16(arr.slice(2, 4))
    this.len = fromBytes16(arr.slice(4, 6))
    this.checksum = fromBytes16(arr.slice(6, 8))
  }
  this.toBytes = () => {
    return [].concat(
      toBytes16(this.source), toBytes16(this.dest),
      toBytes16(this.len), toBytes16(this.checksum)
    )
  }
  this.headerLen = () => 8
  this.toString = () => bytes2hex(this.toBytes())
}

const TCP_FLAGS = {
  FIN: 0x01,
  SYN: 0x02,
  RST: 0x04,
  PSH: 0x08,
  ACK: 0x10,
  URG: 0x20,
  ECE: 0x40,
  CWR: 0x80
}

function TCP({
  source = 0, dest = 0,
  seq = 0, ack = 0,
  data_offset = 5,  // 20 bytes
  flags = 0,  // bitmask
  window = 65535,
  checksum = 0,
  urgent = 0,
  options = []
} = {}) {
  this.source = source
  this.dest = dest
  this.seq = seq
  this.ack = ack
  this.data_offset = data_offset
  this.flags = flags
  this.window = window
  this.checksum = checksum
  this.urgent = urgent
  this.options = options

  this.fromBytes = (arr) => {
    this.source = fromBytes16(arr.slice(0, 2))
    this.dest = fromBytes16(arr.slice(2, 4))
    this.seq = fromBytes32(arr.slice(4, 8))
    this.ack = fromBytes32(arr.slice(8, 12))

    this.data_offset = arr[12] >> 4
    this.flags = arr[13]

    this.window = fromBytes16(arr.slice(14, 16))
    this.checksum = fromBytes16(arr.slice(16, 18))
    this.urgent = fromBytes16(arr.slice(18, 20))

    this.options = arr.slice(20, this.data_offset * 4)
    return this
  }

  this.toBytes = () => {
    let bytes = []

    this.data_offset = 5 + (this.options.length / 4)

    bytes = bytes.concat(
      toBytes16(this.source), toBytes16(this.dest),
      toBytes32(this.seq), toBytes32(this.ack),
      toBytes8((this.data_offset << 4) & 0xf0),
      toBytes8(this.flags),
      toBytes16(this.window), toBytes16(this.checksum),
      toBytes16(this.urgent), this.options
    )

    return bytes
  }

  this.headerLen = () => {
    this.data_offset = 5 + (this.options.length / 4)
    return this.data_offset * 4
  }

  this.toString = () => bytes2hex(this.toBytes())
}

// GTP header
function GTPv1({
  pt = true, e = false, s = false, pn = false,
  msg_type = 0, len = 0, teid = 0,
  sqn = 0, n_pdu_num = 0, next_ext_type = 0
} = {}) {
  this.ver = 1
  this.pt = pt
  this.e = e
  this.s = s
  this.pn = pn
  this.msg_type = msg_type
  this.len = len
  this.teid = teid
  this.sqn = sqn
  this.n_pdu_num = n_pdu_num
  this.next_ext_type = next_ext_type
  this.toBytes = () => {
    this.len += ((this.s || this.pn || this.e) ? 4 : 0)
    bytes = [].concat(
      toBytes8((this.ver << 5) | (Number(this.pt) << 4) | (Number(this.e) << 2) | (Number(this.s) << 1) | Number(this.pn)),
      toBytes8(this.msg_type),
      toBytes16(this.len),
      toBytes32(this.teid)
    )
    if (this.s || this.pn || this.e) {
      bytes = bytes.concat(toBytes16(this.sqn))
      bytes = bytes.concat(toBytes8(this.n_pdu_num))
      bytes = bytes.concat(toBytes8(this.next_ext_type))
    }
    return bytes
  }
  this.headerLen = () => 8 + ((this.s || this.pn || this.e) ? 4 : 0)
  this.toString = () => bytes2hex(this.toBytes())
}
