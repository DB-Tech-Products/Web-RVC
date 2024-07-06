import { processCanData, addLogEntryToTable, getCsvContent, updateSourceTable } from './ui.js';

export let port;
export let reader;
export let outputStream;

export async function connect() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 250000 });
    document.title = 'RV-C Tool: Connected';

    reader = port.readable.getReader();
    outputStream = port.writable.getWriter();

    await outputStream.write(new TextEncoder().encode('O\r')); // Open CAN channel
    await outputStream.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000

    readData();

    document.getElementById('connectButton').disabled = true;
    document.getElementById('disconnectButton').disabled = false;
    document.getElementById('sendButton').disabled = false;
    document.getElementById('pauseButton').disabled = false;
  } catch (error) {
    document.title = 'RV-C Tool: Error Connecting';
    console.error(error);
  }
}

export async function disconnect() {
  try {
    await outputStream.write(new TextEncoder().encode('C\r')); // Close CAN channel
    await reader.cancel();
    await port.close();
    document.title = 'RV-C Tool: Disconnected';

    document.getElementById('connectButton').disabled = false;
    document.getElementById('disconnectButton').disabled = true;
    document.getElementById('sendButton').disabled = true;
    document.getElementById('pauseButton').disabled = true;
  } catch (error) {
    document.title = 'RV-C Tool: Error Disconnecting';
    console.error(error);
  }
}

export async function sendCommand() {
  const priority = document.getElementById('priority').value;
  const dgn = document.getElementById('dgn').value;
  const sourceAddr = document.getElementById('sourceAddr').value;
  const payload = document.getElementById('payload').value.replace(/[^0-9a-fA-F]/g, '');
  if (dgn.length !== 5 || !/^[0-1]/.test(dgn)) {
    alert('DGN must be 5 hex digits and start with 0 or 1.');
    return;
  }
  if (sourceAddr.length !== 2 || !/^[0-9a-fA-F]{2}$/.test(sourceAddr)) {
    alert('Source Address must be 2 hex digits.');
    return;
  }
  const id = `${priority}${dgn}${sourceAddr}`;
  const len = (payload.length / 2).toString(16).toUpperCase().padStart(1, '0');
  const command = `T${id}${len}${payload}\r`;

  await outputStream.write(new TextEncoder().encode(command));
  document.getElementById('dgn').value = '';
  document.getElementById('sourceAddr').value = '';
  document.getElementById('payload').value = '';
}

export async function readData() {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      if (!window.paused) {
        const text = decoder.decode(value);
        processCanData(text);
      }
    }
  } catch (error) {
    console.error(error);
  }
}
