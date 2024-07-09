import { serial as polyfill } from 'https://unpkg.com/web-serial-polyfill';

let port;
let reader;
let writer;
let buffer = '';

export async function connect(debug = false) {
  port = await polyfill.requestPort();
  await port.open({ baudRate: 250000 });

  reader = port.readable.getReader();
  writer = port.writable.getWriter();

  await writer.write(new TextEncoder().encode('C\r'));  // Close CAN channel (if open)
  await writer.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000
  await writer.write(new TextEncoder().encode('M0\r')); // Set Normal mode
  await writer.write(new TextEncoder().encode('O\r'));  // Open CAN channel

  if (debug) console.log("Connected to serial port");
}

export async function disconnect(debug = false) {
  try {
    await writer.write(new TextEncoder().encode('C\r')); // Close CAN channel
    await reader.cancel(); // Cancel the reader to release it
    reader.releaseLock(); // Release the reader lock
    writer.releaseLock(); // Release the writer lock
    await port.close(); // Close the port
    if (debug) console.log("Disconnected from serial port");
  } catch (error) {
    if (debug) console.error("Error during disconnect:", error);
  }
}

export async function send(data, debug = false) {
  await writer.write(new TextEncoder().encode(data));
  if (debug) console.log(`Sent data: ${data}`);
}

export async function readData(callback, debug = false) {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const decodedData = decoder.decode(value);
      if (debug) console.log("Read data:", decodedData);
      buffer += decodedData;
      let lines = buffer.split('\r');
      buffer = lines.pop(); // Keep the last partial line in the buffer
      for (const line of lines) {
        callback(line);
      }
    }
  } catch (error) {
    if (debug) console.error("Error reading data:", error);
  }
}

export async function healthCheck(debug = false) {
  const decoder = new TextDecoder();
  await writer.write(new TextEncoder().encode('V\r')); // Version command or any health check command
  try {
    const { value, done } = await reader.read();
    if (done) return false;
    const response = decoder.decode(value);
    if (debug) console.log("Health check response:", response);
    return true;
  } catch (error) {
    if (debug) console.error("Health check error:", error);
    return false;
  }
}
