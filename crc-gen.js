function PrintVerilogCrc(module_name, lfsr_poly_size, num_data_bits, lfsr_poly_arr, lfsr_matrix) {
  let N = lfsr_poly_size
  let M = num_data_bits

  println('// Copyright (C) 2009 OutputLogic.com')
  println('// This source file may be used and distributed without restriction ')
  println('// provided that this copyright statement is not removed from the file ')
  println('// and that any derivative work contains the original copyright notice ')
  println('// and the associated disclaimer.')
  println('// THIS SOURCE FILE IS PROVIDED \"AS IS\" AND WITHOUT ANY EXPRESS ')
  println('// OR IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED ')
  println('// WARRANTIES OF MERCHANTIBILITY AND FITNESS FOR A PARTICULAR PURPOSE.')
  println('// --------------------------------------------------------------------------------')
  print(`// CRC module for data[${M - 1}:0], crc[${N - 1}:0]=`)
  for (let l = 0; l < N; l++) {
    if (lfsr_poly_arr[l])
      if (l)
        print(`+x^${l}`)
      else
        print('1')
  }
  println(`+x^${lfsr_poly_size}`);
  println('// --------------------------------------------------------------------------------')
  println(`module ${module_name}(`)
  println(`    input   [${num_data_bits - 1}:0] data_in,`)
  println(`    input   [${lfsr_poly_size - 1}:0] crc_in,`)
  println(`    output  [${lfsr_poly_size - 1}:0] crc_out`)
  println(`);`)
  println(`reg [${lfsr_poly_size - 1}:0] lfsr_c, lfsr_q;`)
  println(`assign crc_out = lfsr_q;`)
  println(`always @(*) lfsr_q = crc_in`)
  println(`always @(*) begin`)

  // print columns of LFSR[(N+M)xN] matrix
  // go thru each column[n2]
  for (let n2 = 0; n2 < N; n2++) {
    print(`lfsr_c[${n2}] = `)
    let is_first = true

    for (let n1 = 0; n1 < N; n1++) {
      if (lfsr_matrix[n1 * N + n2]) {
        if (is_first) {
          print(`lfsr_q[${n1}]`)
          is_first = false
        } else
          print(` ^ lfsr_q[${n1}]`)
      }
    }
    for (let m1 = 0; m1 < M; m1++) {
      if (lfsr_matrix[N * N + m1 * N + n2]) {
        if (is_first) {
          print(`data_in[${m1}]`)
          is_first = false
        } else
          print(` ^ data_in[${m1}]`)
      }
    }
    println(';')
  }

  println(`end`)
  println(`endmodule`)
}

function lfsr_serial_shift_crc(
  num_bits_to_shift,
  lfsr_poly_size,
  lfsr_poly,
  lfsr_cur,
  // lfsr_next,
  num_data_bits,
  data_cur
) {
  let lfsr_next = Array.from({ length: lfsr_cur.length })

  for (let i = 0; i < lfsr_poly_size; i++) {
    lfsr_next[i] = lfsr_cur[i]
  }

  for (j = 0; j < num_bits_to_shift; j++) {
    // shift the entire LFSR
    let lfsr_upper_bit = lfsr_next[lfsr_poly_size - 1]

    for (let i = lfsr_poly_size - 1; i > 0; i--) {
      if (lfsr_poly[i])
        lfsr_next[i] = lfsr_next[i - 1] ^ lfsr_upper_bit ^ data_cur[j]
      else
        lfsr_next[i] = lfsr_next[i - 1]
    }

    lfsr_next[0] = lfsr_upper_bit ^ data_cur[j]
  }

  return lfsr_next
}

function build_crc_matrix(
  lfsr_poly_size,
  lfsr_poly_array,
  num_data_bits
) {
  let N = lfsr_poly_size
  let M = num_data_bits
  let lfsr_matrix = Array.from({ length: (M + N) * N })
  let lfsr_cur = Array.from({ length: N })
  let lfsr_next = Array.from({ length: N })
  let data_cur = Array.from({ length: M })

  for (let n1 = 0; n1 < N; n1++) {
    lfsr_cur[n1] = 0
  }

  for (let m1 = 0; m1 < M; m1++) {
    data_cur[m1] = 0
  }

  // LFSR-2-LFSR matrix[NxN], data_cur=0
  for (let n1 = 0; n1 < N; n1++) {
    lfsr_cur[n1] = 1

    if (n1)
      lfsr_cur[n1 - 1] = 0

    lfsr_next = lfsr_serial_shift_crc(
      M,
      N,
      lfsr_poly_array,
      lfsr_cur,
      M,
      data_cur
    )

    for (let n2 = 0; n2 < N; n2++) {
      if (lfsr_next[n2])
        lfsr_matrix[n1 * N + n2] = 1
    }
  }

  for (let n1 = 0; n1 < N; n1++) {
    lfsr_cur[n1] = 0
  }

  for (let m1 = 0; m1 < M; m1++) {
    data_cur[m1] = 0
  }

  // Data-2-LFSR matrix[MxN], lfsr_cur=0
  for (let m1 = 0; m1 < M; m1++) {
    data_cur[m1] = 1

    if (m1)
      data_cur[m1 - 1] = 0

    lfsr_next = lfsr_serial_shift_crc(
      M,
      N,
      lfsr_poly_array,
      lfsr_cur,
      M,
      data_cur
    )

    // Data-2-LFSR matrix[MxN]
    // Invert CRC data bits
    for (let n2 = 0; n2 < N; n2++) {
      if (lfsr_next[n2])
        lfsr_matrix[N * N + (M - m1 - 1) * N + n2] = 1
    }
  }

  return lfsr_matrix
}

function CrcGen(module_name, data_width = 8, poly_width = 32, poly_str = "04c11db7") {
  if (poly_str.length < Math.floor((poly_width + 3) / 4)) {
    println(`invalid poly string`)
    return
  }

  let lfsr_poly_array = Array.from({ length: poly_width })

  for (let i = 0; i < poly_width; i++) {
    let cur_byte = poly_str[poly_str.length - 1 - Math.floor(i / 4)]
    let nibble = 0

    if (cur_byte.charCodeAt(0) >= '0'.charCodeAt(0) && cur_byte.charCodeAt(0) <= '9'.charCodeAt(0))
      nibble = cur_byte.charCodeAt(0) - '0'.charCodeAt(0)
    else if (cur_byte.charCodeAt(0) >= 'a'.charCodeAt(0) && cur_byte.charCodeAt(0) <= 'f'.charCodeAt(0))
      nibble = cur_byte.charCodeAt(0) - 'a'.charCodeAt(0) + 10
    else if (cur_byte.charCodeAt(0) >= 'A'.charCodeAt(0) && cur_byte.charCodeAt(0) <= 'F'.charCodeAt(0))
      nibble = cur_byte.charCodeAt(0) - 'A'.charCodeAt(0) + 10

    lfsr_poly_array[i] = 1 & (nibble >> (i % 4))
  }

  let lfsr_matrix = build_crc_matrix(
    poly_width,
    lfsr_poly_array,
    data_width
  )

  PrintVerilogCrc(module_name, poly_width, data_width, lfsr_poly_array, lfsr_matrix)
}
