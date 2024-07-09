// serial.js
let port;
let reader;
let outputStream;

export async function connect() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 250000 });

  reader = port.readable.getReader();
  outputStream = port.writable.getWriter();

  await outputStream.write(new TextEncoder().encode('C\r'));  // Close CAN channel (if open)
  await outputStream.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000
  await outputStream.write(new TextEncoder().encode('M0\r')); // Set Normal mode
  await outputStream.write(new TextEncoder().encode('O\r'));  // Open CAN channel
}

export async function disconnect() {
  try {
    await outputStream.write(new TextEncoder().encode('C\r')); // Close CAN channel
    await reader.cancel(); // Cancel the reader to release it
    await reader.releaseLock(); // Release the reader lock
    await outputStream.close(); // Close the writer stream
    await port.close(); // Close the port
    console.log("Disconnected from serial port");
  } catch (error) {
    console.error("Error during disconnect:", error);
  }
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
      const decodedData = decoder.decode(value);
      console.log("Read data:", decodedData);
      callback(decodedData);
    }
  } catch (error) {
    console.error("Error reading data:", error);
  }
}

export async function healthCheck() {
  const decoder = new TextDecoder();
  await outputStream.write(new TextEncoder().encode('V\r')); // Version command or any health check command
  try {
    const { value, done } = await reader.read();
    if (done) return false;
    const response = decoder.decode(value);
    console.log("Health check response:", response);
    return true;
  } catch (error) {
    console.error("Health check error:", error);
    return false;
  }
}
