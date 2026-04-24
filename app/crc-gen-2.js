function PrintVerilogCrc2(
  module_name,
  config,
  lfsr_poly_arr,
  lfsr_matrix
) {
  println('/*')
  println('* Copyright (C) 2009 OutputLogic.com')
  println('* Copyright (c) 2016-2023 Alex Forencich')
  println('* ')
  println('* Permission is hereby granted, free of charge, to any person obtaining a copy')
  println('* of this software and associated documentation files (the "Software"), to deal')
  println('* in the Software without restriction, including without limitation the rights')
  println('* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell')
  println('* copies of the Software, and to permit persons to whom the Software is')
  println('* furnished to do so, subject to the following conditions:')
  println('* ')
  println('* The above copyright notice and this permission notice shall be included in')
  println('* all copies or substantial portions of the Software.')
  println('* ')
  println('* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR')
  println('* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY')
  println('* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE')
  println('* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER')
  println('* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,')
  println('* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN')
  println('* THE SOFTWARE.')
  println('*/')
  println(``)
  println('// --------------------------------------------------------------------------------')
  println(`// Configurations:`)
  println(`// LFSR_WIDTH = ${config.LFSR_WIDTH}`)
  print(`// LFSR_POLY = ${config.LFSR_WIDTH}'h${config.LFSR_POLY} = `)
  for (let l = 0; l < config.LFSR_WIDTH; l++) {
    if (lfsr_poly_arr[l])
      if (l)
        print(`+x^${l}`)
      else
        print('x^0')
  }
  println(`+x^${config.LFSR_WIDTH}`);
  println(`// LFSR_CONFIG = ${config.LFSR_CONFIG}`)
  println(`// LFSR_FEED_FORWARD = ${config.LFSR_FEED_FORWARD}`)
  println(`// REVERSE = ${config.REVERSE}`)
  println(`// DATA_WIDTH = ${config.DATA_WIDTH}`)
  println('// --------------------------------------------------------------------------------')
  println(``)
  println(`module ${module_name}(`)
  println(`    input   [${config.DATA_WIDTH - 1}:0] data_in,`)
  println(`    input   [${config.LFSR_WIDTH - 1}:0] crc_in,`)
  println(`    output  [${config.LFSR_WIDTH - 1}:0] crc_out`)
  println(`);`)
  println(`reg [${config.LFSR_WIDTH - 1}:0] lfsr_c, lfsr_q;`)
  println(`assign crc_out = lfsr_c;`)
  println(`always @(*) lfsr_q = crc_in;`)
  println(`always @(*) begin`)
  // print columns of LFSR[(N+M)xN] matrix
  // go thru each column[n2]

  for (let n2 = 0; n2 < config.LFSR_WIDTH; n2++) {
    print(`lfsr_c[${n2}] = `)
    let is_first = true
    for (let n1 = 0; n1 < config.LFSR_WIDTH; n1++) {
      if (lfsr_matrix.state[n2][n1]) {
        if (is_first) {
          print(`lfsr_q[${n1}]`)
          is_first = false
        } else
          print(` ^ lfsr_q[${n1}]`)
      }
    }
    for (let m1 = 0; m1 < config.DATA_WIDTH; m1++) {
      if (lfsr_matrix.data[n2][m1]) {
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

function build_crc_matrix_2(
  LFSR_WIDTH,
  LFSR_POLY,
  LFSR_CONFIG,
  LFSR_FEED_FORWARD,
  REVERSE,
  DATA_WIDTH
) {
  const lfsr_mask = (index) => {
    let lfsr_mask_state = Array.from({ length: LFSR_WIDTH })
    let lfsr_mask_data = Array.from({ length: LFSR_WIDTH })
    let output_mask_state = Array.from({ length: DATA_WIDTH })
    let output_mask_data = Array.from({ length: DATA_WIDTH })

    let state_val = Array.from({ length: LFSR_WIDTH })
    let data_val = Array.from({ length: DATA_WIDTH })
    let data_mask = Array.from({ length: DATA_WIDTH })

    var i, j;

    // init bit masks
    for (i = 0; i < LFSR_WIDTH; i++) {
      lfsr_mask_state[i] = Array.from({ length: LFSR_WIDTH }, () => 0);
      lfsr_mask_state[i][i] = 1;
      lfsr_mask_data[i] = Array.from({ length: DATA_WIDTH }, () => 0);
    }
    for (i = 0; i < DATA_WIDTH; i++) {
      output_mask_state[i] = Array.from({ length: LFSR_WIDTH }, () => 0);
      if (i < LFSR_WIDTH)
        output_mask_state[i][i] = 1;
      output_mask_data[i] = Array.from({ length: DATA_WIDTH }, () => 0);
    }

    // simulate shift register
    if (LFSR_CONFIG == "FIBONACCI") {
      // Fibonacci configuration
      for (i = DATA_WIDTH - 1; i > -1; i--) {
        data_mask = Array.from({ length: DATA_WIDTH }, (_, ii) => (i == ii) ? 1 : 0)
        // determine shift in value
        // current value in last FF, XOR with input data bit (MSB first)
        state_val = lfsr_mask_state[LFSR_WIDTH - 1]
        data_val = lfsr_mask_data[LFSR_WIDTH - 1]
        for (let jj = 0; jj < DATA_WIDTH; jj++)
          data_val[jj] = data_val[jj] ^ data_mask[jj]

        // add XOR inputs from correct indicies
        for (j = 1; j < LFSR_WIDTH; j++) {
          if (LFSR_POLY[j] == 1) {
            for (let jj = 0; jj < LFSR_WIDTH; jj++)
              state_val[jj] = lfsr_mask_state[j - 1][jj] ^ state_val[jj]
            for (let jj = 0; jj < DATA_WIDTH; jj++)
              data_val[jj] = lfsr_mask_data[j - 1][jj] ^ data_val[jj]
          }
        }

        // shift
        for (j = LFSR_WIDTH - 1; j > 0; j--) {
          lfsr_mask_state[j] = lfsr_mask_state[j - 1];
          lfsr_mask_data[j] = lfsr_mask_data[j - 1];
        }
        for (j = DATA_WIDTH - 1; j > 0; j--) {
          output_mask_state[j] = output_mask_state[j - 1];
          output_mask_data[j] = output_mask_data[j - 1];
        }
        output_mask_state[0] = state_val;
        output_mask_data[0] = data_val;
        if (LFSR_FEED_FORWARD) {
          // only shift in new input data
          state_val = Array.from({ length: LFSR_WIDTH }, () => 0)
          data_val = data_mask
        }
        lfsr_mask_state[0] = state_val;
        lfsr_mask_data[0] = data_val;
      }
    } else if (LFSR_CONFIG == "GALOIS") {
      // Galois configuration
      for (i = DATA_WIDTH - 1; i > -1; i--) {
        data_mask = Array.from({ length: DATA_WIDTH }, (_, ii) => (i == ii) ? 1 : 0)
        // determine shift in value
        // current value in last FF, XOR with input data bit (MSB first)
        state_val = lfsr_mask_state[LFSR_WIDTH - 1]
        data_val = lfsr_mask_data[LFSR_WIDTH - 1]
        for (let jj = 0; jj < DATA_WIDTH; jj++)
          data_val[jj] = data_val[jj] ^ data_mask[jj]

        // shift
        for (j = LFSR_WIDTH - 1; j > 0; j--) {
          lfsr_mask_state[j] = lfsr_mask_state[j - 1];
          lfsr_mask_data[j] = lfsr_mask_data[j - 1];
        }
        for (j = DATA_WIDTH - 1; j > 0; j--) {
          output_mask_state[j] = output_mask_state[j - 1];
          output_mask_data[j] = output_mask_data[j - 1];
        }
        output_mask_state[0] = state_val;
        output_mask_data[0] = data_val;
        if (LFSR_FEED_FORWARD) {
          // only shift in new input data
          state_val = Array.from({ length: LFSR_WIDTH }, () => 0)
          data_val = data_mask
        }
        lfsr_mask_state[0] = state_val;
        lfsr_mask_data[0] = data_val;

        // add XOR inputs from correct indicies
        for (j = 1; j < LFSR_WIDTH; j++) {
          if (LFSR_POLY[j] == 1) {
            for (let jj = 0; jj < LFSR_WIDTH; jj++)
              lfsr_mask_state[j][jj] = lfsr_mask_state[j][jj] ^ state_val[jj]
            for (let jj = 0; jj < DATA_WIDTH; jj++)
              lfsr_mask_data[j][jj] = lfsr_mask_data[j][jj] ^ data_val[jj]
          }
        }
      }
    } else {
      return
    }

    // reverse bits if selected
    if (REVERSE) {
      if (index < LFSR_WIDTH) {
        state_val = Array.from({ length: LFSR_WIDTH }, () => 0)
        for (i = 0; i < LFSR_WIDTH; i++)
          state_val[i] = lfsr_mask_state[LFSR_WIDTH - index - 1][LFSR_WIDTH - i - 1];

        data_val = Array.from({ length: DATA_WIDTH }, () => 0)
        for (i = 0; i < DATA_WIDTH; i++)
          data_val[i] = lfsr_mask_data[LFSR_WIDTH - index - 1][DATA_WIDTH - i - 1];
      } else {
        state_val = Array.from({ length: LFSR_WIDTH }, () => 0)
        for (i = 0; i < LFSR_WIDTH; i = i + 1)
          state_val[i] = output_mask_state[DATA_WIDTH - (index - LFSR_WIDTH) - 1][LFSR_WIDTH - i - 1];

        data_val = Array.from({ length: DATA_WIDTH }, () => 0)
        for (i = 0; i < DATA_WIDTH; i++)
          data_val[i] = output_mask_data[DATA_WIDTH - (index - LFSR_WIDTH) - 1][DATA_WIDTH - i - 1];
      }
    } else {
      if (index < LFSR_WIDTH) {
        state_val = lfsr_mask_state[index];
        data_val = lfsr_mask_data[index];
      } else {
        state_val = output_mask_state[index - LFSR_WIDTH];
        data_val = output_mask_data[index - LFSR_WIDTH];
      }
    }

    return {
      data: data_val,
      state: state_val
    }
  }

  let data_matrix = []
  let state_matrix = []

  for (let n = 0; n < LFSR_WIDTH; n++) {
    let { data, state } = lfsr_mask(n)
    state_matrix = [...state_matrix, state]
    data_matrix = [...data_matrix, data]
  }

  return {
    data: data_matrix,
    state: state_matrix
  }
}

function CrcGen2(
  module_name, // module name
  data_width = 8, // width of data input
  poly_width = 32, // width of LFSR
  poly_str = "10000001", // LFSR polynomial in hexadecimal
  poly_cfg = "FIBONACCI", // LFSR configuration: "GALOIS", "FIBONACCI"
  feed_forward = 0, // LFSR feed forward enable
  reverse = 0 // bit-reverse input and output
) {
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

  let lfsr_matrix = build_crc_matrix_2(
    poly_width,
    lfsr_poly_array,
    poly_cfg,
    feed_forward,
    reverse,
    data_width
  )

  let config = {
    LFSR_WIDTH: poly_width,
    LFSR_POLY: poly_str,
    LFSR_CONFIG: poly_cfg,
    LFSR_FEED_FORWARD: feed_forward,
    REVERSE: reverse,
    DATA_WIDTH: data_width
  }

  PrintVerilogCrc2(
    module_name,
    config,
    lfsr_poly_array,
    lfsr_matrix
  )
}
