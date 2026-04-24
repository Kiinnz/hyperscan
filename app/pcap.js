function pcapFile() {
  this.magic_number = 0xA1B2C3D4
  this.major_version = 2
  this.minor_version = 4
  this.link_type = 1 // LINKTYPE_ETHERNET
  this.packets = []
  this.recordPacket = (pkt) => {
    let t = Date.now()
    let ts_sec = Math.floor(t / 1000)
    let ts_msec = t - ts_sec * 1000
    this.packets.push({ ts_sec: ts_sec, ts_ms: ts_msec, data: pkt })
  }
  this.toBytes = () => {
    let bytes = [].concat(
      toBytes32(this.magic_number),
      toBytes16(this.major_version), toBytes16(this.minor_version),
      [0, 0, 0, 0], // Reserved1
      [0, 0, 0, 0], // Reserved2
      [255, 255, 255, 255], // SnapLen
      [0, 0], toBytes16(this.link_type)
    )
    for (let i = 0; i < this.packets.length; i++) {
      let p = this.packets[i]
      bytes = bytes.concat(
        toBytes32(p.ts_sec),
        toBytes32(p.ts_msec),
        toBytes32(p.data.length),
        toBytes32(p.data.length),
        p.data
      )
    }
    return bytes
  }
}
