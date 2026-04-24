function main1() {
  // The .pcap file
  let pcap = new pcapFile

  // User data
  // let data = hex2bytes('454544594d71616b48384d672f34416b342b6f36342b4a5062555663427730795374676c7a346f41')
  // let data = randBytes(2000)
  let data = Array.from({ length: 4000 }, (x, i) => i & 0xff)
  let csum = rfc1071_csum(data)
  let udp = new UDP({
    source: 50457,
    dest: 1947,
  })
  udp.len = data.length + udp.headerLen()
  csum = rfc1071_csum(udp.toBytes(), { pre_csum: csum })
  let ip4 = new IPv4({
    source: '10.61.61.17',
    dest: '255.255.255.255',
    protocol: 17,
    ttl: 128,
    id: 0x24b9
  })
  // udp.checksum = rfc1071_csum(ip4.pseudoHeader(udp.len), { pre_csum: csum })
  udp.checksum = 12345
  ip4.total_len = udp.len + ip4.headerLen()
  // ip4.checksum = rfc1071_csum(ip4.toBytes())
  ip4.checksum = 6789
  let usr_data = ip4.toBytes().concat(udp.toBytes(), data)

  // Final packet
  let eth = new Ether({
    source: '4c:d7:17:8c:11:57',
    dest: '00:50:56:88:b7:61',
    eth_type: 0x0800,
    vlanid: 1234
  })
  // let pkt = eth.toBytes().concat(outer_ip4.toBytes(), outer_udp.toBytes(), gtp.toBytes(), usr_data)
  // let pkt = eth.toBytes().concat(usr_data)
  // pcap.recordPacket(pkt)

  udp.checksum = 0
  csum = rfc1071_csum(udp.toBytes().concat(data))
  udp.checksum = rfc1071_csum(ip4.pseudoHeader(udp.len), { pre_csum: csum })
  ip4.checksum = 0
  ip4.checksum = rfc1071_csum(ip4.toBytes())
  let pkt = eth.toBytes().concat(ip4.toBytes(), udp.toBytes())

  print(`<div style="font-family: monospace, monospace">${bytes2hex(pkt, ' ', 16)}</div>`)

  let frags = IPv4Fragment(eth.toBytes().concat(ip4.toBytes()), udp.toBytes().concat(data), 1500, eth.headerLen())
  frags.map((f, i) => {
    pcap.recordPacket(f)
  })
  // pcap.recordPacket(frags[1])
  // pcap.recordPacket(frags[3])
  // pcap.recordPacket(frags[2])
  // pcap.recordPacket(frags[0])
  // pcap.recordPacket(frags[4])
  // pcap.recordPacket(frags[5])

  // Download .pcap file
  let f = new FILE()
  f.write(pcap.toBytes())
  f.saveAs('packets.pcap')
}

function main2() {
  let pcap = new pcapFile
  let info = [
    {
      len: 500,
      id: 0xabcd,
    },
    {
      len: 1000,
      id: 0x24b9,
    },
    {
      len: 1500,
      id: 0x46aa,
    },
    {
      len: 2000,
      id: 0x7648,
    },
  ]
  let pkts = []
  let frags = []

  info.map((x) => {
    let data = Array.from({ length: x.len }, (_, i) => i & 0xff)
    let csum = rfc1071_csum(data)
    let udp = new UDP({
      source: 50457,
      dest: 1947,
    })
    udp.len = data.length + udp.headerLen()
    csum = rfc1071_csum(udp.toBytes(), { pre_csum: csum })
    let ip4 = new IPv4({
      source: '10.61.61.17',
      dest: '255.255.255.255',
      protocol: 17,
      ttl: 128,
      id: x.id
    })
    // udp.checksum = rfc1071_csum(ip4.pseudoHeader(udp.len), { pre_csum: csum })
    udp.checksum = 12345
    ip4.total_len = udp.len + ip4.headerLen()
    // ip4.checksum = rfc1071_csum(ip4.toBytes())
    ip4.checksum = 6789
    let usr_data = ip4.toBytes().concat(udp.toBytes(), data)

    let eth = new Ether({
      source: '4c:d7:17:8c:11:57',
      dest: '00:50:56:88:b7:61',
      eth_type: 0x0800,
      vlanid: 1234
    })

    // udp.checksum = 0
    // csum = rfc1071_csum(udp.toBytes().concat(data))
    // udp.checksum = rfc1071_csum(ip4.pseudoHeader(udp.len), { pre_csum: csum })
    // ip4.checksum = 0
    // ip4.checksum = rfc1071_csum(ip4.toBytes())

    pkts = [...pkts, eth.toBytes().concat(ip4.toBytes(), udp.toBytes(), data)]
    frags = [...frags, IPv4Fragment(eth.toBytes().concat(ip4.toBytes()), udp.toBytes().concat(data), 1500, eth.headerLen())]
  })
  /*
    pcap.recordPacket(frags[1][1])
    pcap.recordPacket(frags[2][0])
    pcap.recordPacket(frags[2][1])
    pcap.recordPacket(frags[2][2])
    pcap.recordPacket(frags[1][0])
    pcap.recordPacket(frags[3][0])
    pcap.recordPacket(frags[3][1])
    pcap.recordPacket(frags[3][2])
    pcap.recordPacket(frags[3][3])
    pcap.recordPacket(frags[2][4])
    pcap.recordPacket(frags[3][4])
    pcap.recordPacket(frags[0][0])
    pcap.recordPacket(frags[1][2])
    pcap.recordPacket(frags[2][3])
    pcap.recordPacket(frags[3][5])
  */

  // frags.map((f) => {
  //   f.map((p) => {
  //     pcap.recordPacket(p)
  //   })
  // })

  pkts.map((p) => {
    pcap.recordPacket(p)
  })

  // Download .pcap file
  let f = new FILE()
  f.write(pcap.toBytes())
  f.saveAs('dpi.pcap')
}

function main3() {
  // CrcGen2("binary_cam_hash_crc_0", 32, 32, "04c11db7", "GALOIS", 0, 1)
  // CrcGen2("binary_cam_hash_crc_1", 32, 32, "1edc6f41", "GALOIS", 0, 1)
  CrcGen2("ip_asm_hasher_crc", 512, 32, "04c11db7", "GALOIS", 0, 1)
}

function main4() {
  let pcap = new pcapFile
  let info = [
    {
      len: 500,
      id: 0xabcd,
      teid: 0x12345678
    },
    {
      len: 1000,
      id: 0x24b9,
      teid: 0xaabbccdd
    },
    {
      len: 1500,
      id: 0x46aa,
      teid: 0xeeff0001
    },
    {
      len: 5000,
      id: 0x7648,
      teid: 0x02030405
    },
  ]
  let pkts = []

  info.map((x) => {
    let data = Array.from({ length: x.len }, (_, i) => i & 0xff)
    let csum = rfc1071_csum(data)
    let udp = new UDP({
      source: 45050,
      dest: 5001,
    })
    udp.len = data.length + udp.headerLen()
    csum = rfc1071_csum(udp.toBytes(), { pre_csum: csum })
    let ip4 = new IPv4({
      source: '3.3.3.49',
      dest: '4.4.4.195',
      protocol: 17,
      ttl: 128,
      id: x.id
    })
    udp.checksum = rfc1071_csum(ip4.pseudoHeader(udp.len), { pre_csum: csum })
    ip4.total_len = udp.len + ip4.headerLen()
    ip4.checksum = rfc1071_csum(ip4.toBytes())
    let usr_data = ip4.toBytes().concat(udp.toBytes(), data)

    // GTP-U tunnel
    let gtp = new GTPv1({
      pt: true, e: false, s: true, pn: false,
      msg_type: 255, len: usr_data.length, teid: x.teid,
      sqn: 1
    })
    csum = rfc1071_csum(gtp.toBytes(), usr_data)
    let outer_udp = new UDP({
      source: 2152,
      dest: 2152,
    })
    outer_udp.len = usr_data.length + gtp.headerLen() + outer_udp.headerLen()
    csum = rfc1071_csum(outer_udp.toBytes(), { pre_csum: csum })
    let outer_ip4 = new IPv4({
      source: '10.0.0.22',
      dest: '10.1.0.133',
      protocol: 17,
      ttl: 64,
      id: 0x0001
    })
    // outer_udp.checksum = rfc1071_csum(outer_ip4.pseudoHeader(outer_udp.len), { pre_csum: csum })
    outer_udp.checksum = 12345
    outer_ip4.total_len = outer_udp.len + outer_ip4.headerLen()
    // outer_ip4.checksum = rfc1071_csum(outer_ip4.toBytes())
    outer_ip4.checksum = 6789

    // Ethernet header
    let eth = new Ether({
      source: '4c:d7:17:8c:11:57',
      dest: '00:50:56:88:b7:61',
      eth_type: 0x0800,
      vlanid: 1234
    })

    pkts = [...pkts, eth.toBytes().concat(outer_ip4.toBytes(), outer_udp.toBytes(), gtp.toBytes(), usr_data)]
  })

  pkts.map((p) => {
    pcap.recordPacket(p)
  })

  // Download .pcap file
  let f = new FILE()
  f.write(pcap.toBytes())
  f.saveAs('packets.pcap')
}

function main5() {
  let pcap = new pcapFile
  let info = [
    {
      id: 0xabcd,
      teid: 0x12345678,
      length: 4000,
    },
    // {
    //   id: 0x24b9,
    //   teid: 0xaabbccdd,
    //   length: 1428,
    // },
    // {
    //   id: 0x46aa,
    //   teid: 0xeeff0001,
    //   length: 1428,
    // },
    // {
    //   id: 0x7648,
    //   teid: 0x02030405,
    //   length: 1428,
    // },
  ]
  let pkts = []
  let frags = []

  info.map((x) => {
    // User data
    let data = Array.from({ length: x.length }, (x, i) => i & 0xff)
    let udp = new UDP({
      source: 50457,
      dest: 1947,
    })
    udp.len = data.length + udp.headerLen()
    let ip4 = new IPv4({
      source: '10.61.61.17',
      dest: '255.255.255.255',
      protocol: 17,
      ttl: 128,
      id: ~x.id
    })
    csum = rfc1071_csum(udp.toBytes().concat(data))
    udp.checksum = 0
    udp.checksum = rfc1071_csum(ip4.pseudoHeader(udp.len), { pre_csum: csum })
    // udp.checksum = rand() & 0xffff
    ip4.total_len = udp.len + ip4.headerLen()
    ip4.checksum = 0
    ip4.checksum = rfc1071_csum(ip4.toBytes())
    // ip4.checksum = rand() & 0xffff
    let usr_data = ip4.toBytes().concat(udp.toBytes(), data)

    // GTP-U tunnel
    let gtp = new GTPv1({
      pt: true, e: false, s: true, pn: false,
      msg_type: 255, len: usr_data.length, teid: x.teid,
      sqn: 1
    })
    let gtpu_tunnel = gtp.toBytes().concat(usr_data)

    let outer_udp = new UDP({
      source: 2152,
      dest: 2152,
    })
    outer_udp.len = gtpu_tunnel.length + outer_udp.headerLen()
    let outer_ip4 = new IPv4({
      source: '10.61.61.17',
      dest: '255.255.255.255',
      protocol: 17,
      ttl: 128,
      id: x.id
    })
    csum = rfc1071_csum(outer_udp.toBytes().concat(gtpu_tunnel))
    outer_udp.checksum = rfc1071_csum(outer_ip4.pseudoHeader(outer_udp.len), { pre_csum: csum })
    // outer_udp.checksum = rand() & 0xffff
    outer_ip4.total_len = outer_udp.len + outer_ip4.headerLen()
    outer_ip4.checksum = rfc1071_csum(outer_ip4.toBytes())
    // outer_ip4.checksum = rand() & 0xffff

    let eth = new Ether({
      source: '4c:d7:17:8c:11:57',
      dest: '00:50:56:88:b7:61',
      eth_type: 0x0800,
      vlanid: 1234
    })

    let pkt = eth.toBytes().concat(outer_ip4.toBytes(), outer_udp.toBytes(), gtpu_tunnel)
    // let pkt = eth.toBytes().concat(usr_data)

    frags = [...frags, IPv4Fragment(eth.toBytes().concat(outer_ip4.toBytes()), outer_udp.toBytes().concat(gtpu_tunnel), 420, eth.headerLen())]
    pkts = [...pkts, pkt]
  })

  frags.map((f) => {
    f.map((p, i) => {
      // if (i === 2)
        pcap.recordPacket(p)
    })
  })

  frags.map((f) => {
    f.map((p, i) => {
      // if (i === 2)
        pcap.recordPacket(p)
    })
  })

  // pkts.map((p) => {
  //   pcap.recordPacket(p)
  // })

  // Download .pcap file
  let f = new FILE()
  f.write(pcap.toBytes())
  f.saveAs('packets.pcap')
}

// function tuanpca_custom_main() {
//   let pcap = new pcapFile()
//   const TOTAL = 100 // total 100 packets
//   const PAYLOAD_LEN = 64
//   // const VIETTEL = [0x56, 0x69, 0x65, 0x74, 0x74, 0x65, 0x6c]
//   const pattern = [0xfa, 0xa5, 0xf8, 0xfb, 0x22, 0x88]

//   for (let i = 0; i < TOTAL; i++) {
//     let data = Array(PAYLOAD_LEN).fill(0xff)
//     if(i % 10 == 0) {
//       data.splice(0, pattern.length, ...pattern)
//     }

//     let udp = new UDP({
//       source: 1025,
//       dest: 1024,
//     })
//     udp.len = data.length + udp.headerLen()

//     let ip4 = new IPv4({
//       source: '10.0.0.1',
//       dest: '192.168.1.2',
//       protocol: 17,
//       ttl: 128,
//       id: i
//     })

//     let csum = rfc1071_csum(udp.toBytes().concat(data))
//     udp.checksum = rfc1071_csum(ip4.pseudoHeader(udp.len), { pre_csum: csum })

//     ip4.total_len = udp.len + ip4.headerLen()
//     ip4.checksum = 0
//     ip4.checksum = rfc1071_csum(ip4.toBytes())

//     let eth = new Ether({
//       source: '4c:d7:17:8c:11:57',
//       dest: '00:50:56:88:b7:61',
//       eth_type: 0x0800,
//     })

//     let pkt = eth.toBytes().concat(ip4.toBytes(), udp.toBytes(), data)

//     pcap.recordPacket(pkt)
//   }

//   let f = new FILE()
//   f.write(pcap.toBytes())
//   f.saveAs('custom_10_100.pcap')
// }

function tuanpca_custom_main() {
  let pcap = new pcapFile()
  const TOTAL = 1000 // total 100 packets
  const PAYLOAD_LEN = 1342
  const VIETTEL = [0x56, 0x69, 0x65, 0x74, 0x74, 0x65, 0x6c]
  //const pattern = [0xff, 0xff, 0xfa, 0xa5, 0xf8, 0x56, 0x69, 0x65]

  const BASE_SEQ = 1000
  const SERVER_ACK = 2000
  // const CLIENT_ISN = 1000
  // const SERVER_ISN = 5000

  // let clientSeq = CLIENT_ISN
  // let serverSeq = SERVER_ISN

  for (let i = 0; i < TOTAL; i++) {
    let data = Array(PAYLOAD_LEN).fill(0xff)
    if(i % 10 == 0) {
      data.splice(0, VIETTEL.length, ...VIETTEL)
    }

    let tcp 

    // if(i === 0) {
    //   tcp = new TCP({
    //     source: 1025, 
    //     dest: 1024,
    //     seq: BASE_SEQ,
    //     flags: TCP_FLAGS.SYN,
    //     window: 8192
    //   })
    //   data = []
    // }

    // else {
    //   tcp = new TCP({
    //     source: 1025,
    //     dest: 1024,
    //     seq: BASE_SEQ + 1 + (i - 1) * PAYLOAD_LEN,
    //     ack: SERVER_ACK,
    //     flags: TCP_FLAGS.PSH | TCP_FLAGS.ACK,
    //     window: 8192
    //   })
    // }

    tcp = new TCP({
        source: 1025,
        dest: 1024,
        seq: BASE_SEQ + i * PAYLOAD_LEN,
        ack: SERVER_ACK,
        flags: TCP_FLAGS.FIN | TCP_FLAGS.ACK,
        window: 8192,
      })


    let ip4 = new IPv4({
      source: '10.0.0.1',
      dest: '192.168.1.2',
      protocol: 6,
      ttl: 128,
      id: i
    })

    tcp.checksum = 0
    let tcpSegment = tcp.toBytes().concat(data)
    tcp.checksum = rfc1071_csum(
      ip4.pseudoHeader(tcpSegment.length).concat(tcpSegment)
    )
    let tcpLen = tcp.headerLen() + data.length
    // let csum = rfc1071_csum(tcp.toBytes().concat(data))
    // tcp.checksum = rfc1071_csum(
    //   ip4.pseudoHeader(tcpLen),
    //   { pre_csum: csum } 
    // )

    ip4.total_len = ip4.headerLen() + tcpLen
    ip4.checksum = 0
    ip4.checksum = rfc1071_csum(ip4.toBytes())

    let eth = new Ether({
      source: '4c:d7:17:8c:11:57',
      dest: '00:50:56:88:b7:61',
      eth_type: 0x0800,
    })

    let pkt = eth.toBytes().concat(ip4.toBytes(), tcp.toBytes(), data)

    pcap.recordPacket(pkt)
  }

  let f = new FILE()
  f.write(pcap.toBytes())
  f.saveAs('custom_tcp_100_1000.pcap')
}


function main() {
  tuanpca_custom_main()
  // main5()

  // const readFile = async (f) => {
  //   return new Promise((resolve, reject) => {
  //     const r = new FileReader()
  //     r.onload = () => resolve(r.result)
  //     r.onerror = reject
  //     r.readAsText(f)
  //   })
  // }

  // document.getElementById('stdin').addEventListener('change', async (e) => {
  //   const f = e.target.files[0]
  //   if (f) {
  //     const c = await readFile(f)
  //     console.log(c)
  //     print(c)
  //   }
  // })
}
