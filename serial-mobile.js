// serial-mobile.js
import { serial as polyfill, SerialPort as SerialPortPolyfill } from 'https://unpkg.com/web-serial-polyfill';

let port;
let reader;
let writer;

export async function connect() {
    if ('serial' in navigator) {
        port = await navigator.serial.requestPort();
    } else {
        polyfill.apply();
        port = await SerialPortPolyfill.requestPort();
    }
    await port.open({ baudRate: 250000 });

    reader = port.readable.getReader();
    writer = port.writable.getWriter();

    await writer.write(new TextEncoder().encode('C\r')); // Close CAN channel (if open)
    await writer.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000
    await writer.write(new TextEncoder().encode('M0\r')); // Set Normal mode
    await writer.write(new TextEncoder().encode('O\r')); // Open CAN channel
}

export async function disconnect() {
    try {
        await writer.write(new TextEncoder().encode('C\r')); // Close CAN channel
        await reader.cancel(); // Cancel the reader to release it
        await reader.releaseLock(); // Release the reader lock
        await writer.close(); // Close the writer stream
        await port.close(); // Close the port
        console.log("Disconnected from serial port");
    } catch (error) {
        console.error("Error during disconnect:", error);
    }
}

export async function send(data) {
    await writer.write(new TextEncoder().encode(data));
}

export async function readData(callback) {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const decodedData = decoder.decode(value);
      console.log("Read data:", decodedData);
      callback(decodedData);
    }
  } catch (error) {
    console.error("Error reading data:", error);
  }
}
