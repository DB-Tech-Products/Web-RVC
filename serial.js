// serial.js
let port;
let reader;
let outputStream;

export async function connect() {
    /*const decoder = new TextDecoder();
    const readWithTimeout = async (timeout = 1000) => {
      const readerPromise = reader.read();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout));
        return Promise.race([readerPromise, timeoutPromise]);
    }*/

  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 250000 });

  reader = port.readable.getReader();
  outputStream = port.writable.getWriter();

  //await outputStream.write(new TextEncoder().encode('O\r'));  // Open CAN channel
  await outputStream.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000
  await outputStream.write(new TextEncoder().encode('M0\r')); // Set Normal mode
  await outputStream.write(new TextEncoder().encode('O\r'));  // Open CAN channel

  /*await outputStream.write(new TextEncoder().encode('E\r')); // Query error register
  let { value } = await readWithTimeout();
  let response = decoder.decode(value);
  console.log("Error register response:", response);*/

  // Verify configuration
  //await verifyConfiguration();
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

async function verifyConfiguration() {
  const decoder = new TextDecoder();
  const readWithTimeout = async (timeout = 1000) => {
    const readerPromise = reader.read();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout));
    return Promise.race([readerPromise, timeoutPromise]);
  };

  try {
    // Verify baud rate
    /*await outputStream.write(new TextEncoder().encode('S\r')); // Query baud rate
    console.log("Sent baud rate query");
    let { value } = await readWithTimeout();
    let response = decoder.decode(value);
    console.log("Baud rate response:", response);*/

    // Set baud rate if necessary
    //if (!response.includes('S5')) {
      await outputStream.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000
      console.log("Set baud rate to 250000");
    //}

    // Verify loopback mode
    await outputStream.write(new TextEncoder().encode('L\r')); // Query loopback mode
    console.log("Sent loopback mode query");
    let { value } = await readWithTimeout();
    let response = decoder.decode(value);
    console.log("Loopback mode response:", response);

    // Disable loopback mode if necessary
    if (response.includes('L')) {
      await outputStream.write(new TextEncoder().encode('L0\r')); // Disable loopback mode
      console.log("Disabled loopback mode");
    }
  } catch (error) {
    console.error("Error during configuration verification:", error);
  }
}
