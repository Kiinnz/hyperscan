function IPv4Fragment(header, data, mtu, ip_offset = 14) {
  let lower_layer_hdr = header.slice(0, ip_offset)
  let ip4 = (new IPv4).fromBytes(header.slice(ip_offset, header.length))
  if (ip4.df)
    return [header.concat(data)]
  let frags = []
  let remain = data.length
  ip4.frag_offset = 0
  ip4.mf = true
  while (remain) {
    let frag_start = ip4.frag_offset * 8
    let frag_len = 8 * Math.floor((mtu - ip4.headerLen()) / 8)
    if (frag_len >= remain) {
      frag_len = remain
      ip4.mf = false
    }
    let frag_data = data.slice(frag_start, frag_start + frag_len)
    ip4.total_len = ip4.headerLen() + frag_data.length
    ip4.checksum = 0
    ip4.checksum = rfc1071_csum(ip4.toBytes())
    frags.push(lower_layer_hdr.concat(ip4.toBytes(), frag_data))
    ip4.frag_offset += frag_len / 8
    remain -= frag_len
  }
  return frags
}
