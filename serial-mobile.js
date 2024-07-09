// serial-mobile.js
import { PolyfillSerial } from 'web-serial-polyfill';

let port;
let reader;
let outputStream;

export async function connect() {
  port = await PolyfillSerial.requestPort();
  await port.open({ baudRate: 250000 });

  reader = port.readable.getReader();
  outputStream = port.writable.getWriter();

  await outputStream.write(new TextEncoder().encode('O\r')); // Open CAN channel
  await outputStream.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000
}

export async function disconnect() {
  await outputStream.write(new TextEncoder().encode('C\r')); // Close CAN channel
  await reader.cancel();
  await port.close();
}

export async function send(data) {
  await outputStream.write(new TextEncoder().encode(data));
}

export async function readData(callback) {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      callback(decoder.decode(value));
    }
  } catch (error) {
    console.error(error);
  }
}
