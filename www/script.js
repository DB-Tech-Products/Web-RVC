const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const clearButton = document.getElementById('clearButton');
const exportCsvButton = document.getElementById('exportCsvButton');
const pauseButton = document.getElementById('pauseButton');
const sendButton = document.getElementById('sendButton');
const prioritySelect = document.getElementById('priority');
const dgnInput = document.getElementById('dgn');
const sourceAddrInput = document.getElementById('sourceAddr');
const payloadInput = document.getElementById('payload');
const autoScrollCheckbox = document.getElementById('autoScroll');
const showUnparsedCheckbox = document.getElementById('showUnparsed');
const logTable = document.getElementById('logTable').querySelector('tbody');
const sourceTable = document.getElementById('sourceTable').querySelector('tbody');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

let port;
let reader;
let outputStream;
let paused = false;
let sourceAddresses = {};
let packetsOfInterest = [];
let multiPacketBuffer = {};

// Load the default JSON file
fetch('rvc.json')
  .then(response => response.json())
  .then(data => {
    packetsOfInterest = data.packets;
    uploadStatus.textContent = `${packetsOfInterest.length} packet types defined from default rvc.json:`;
    generatePacketDefinitionsTable(packetsOfInterest);
  })
  .catch(error => {
    uploadStatus.textContent = 'Error loading default JSON';
    console.error('Error loading default JSON:', error);
  });

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        packetsOfInterest = data.packets;
        uploadStatus.textContent = `${packetsOfInterest.length} packet types defined from uploaded JSON:`;
        generatePacketDefinitionsTable(packetsOfInterest);
      } catch (error) {
        uploadStatus.textContent = 'Error parsing JSON';
        console.error('Error parsing JSON:', error);
      }
    };
    reader.readAsText(file);
  }
});

function generatePacketDefinitionsTable(packets) {
  const tableContainer = document.getElementById('packetDefinitionsTable');
  tableContainer.innerHTML = ''; // Clear previous table if any

  if (packets.length > 0) {
    const table = document.createElement('table');
    table.style.width = 'auto';
    table.style.borderCollapse = 'collapse';
    
    packets.forEach(packet => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = packet.name;
      if (packet.text_color) cell.style.color = packet.text_color;
      if (packet.background_color) cell.style.backgroundColor = packet.background_color;
      cell.style.padding = '5px';
      cell.style.border = '1px solid #ccc';
      row.appendChild(cell);
      table.appendChild(row);
    });

    tableContainer.appendChild(table);
  }
}

connectButton.addEventListener('click', async () => {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 250000 });
    document.title = 'RV-C Tool: Connected';

    reader = port.readable.getReader();
    outputStream = port.writable.getWriter();

    await outputStream.write(new TextEncoder().encode('O\r')); // Open CAN channel
    await outputStream.write(new TextEncoder().encode('S5\r')); // Set CAN bit rate to 250000

    readData();

    connectButton.disabled = true;
    disconnectButton.disabled = false;
    sendButton.disabled = false;
    pauseButton.disabled = false;
  } catch (error) {
    document.title = 'RV-C Tool: Error Connecting';
    console.error(error);
  }
});

disconnectButton.addEventListener('click', async () => {
  try {
    await outputStream.write(new TextEncoder().encode('C\r')); // Close CAN channel
    await reader.cancel();
    await port.close();
    document.title = 'RV-C Tool: Disconnected';

    connectButton.disabled = false;
    disconnectButton.disabled = true;
    sendButton.disabled = true;
    pauseButton.disabled = true;
  } catch (error) {
    document.title = 'RV-C Tool: Error Disconnecting';
    console.error(error);
  }
});

sendButton.addEventListener('click', async () => {
  const priority = prioritySelect.value;
  const dgn = dgnInput.value;
  const sourceAddr = sourceAddrInput.value;
  const payload = payloadInput.value.replace(/[^0-9a-fA-F]/g, '');
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
});

clearButton.addEventListener('click', () => {
  logTable.innerHTML = '';
  sourceAddresses = {};
  multiPacketBuffer = {}; // Clear multi-packet buffer
  updateSourceTable();
});

exportCsvButton.addEventListener('click', () => {
  const csvContent = getCsvContent();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RVC_Log.csv';
  a.click();
  URL.revokeObjectURL(url);
});

pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
});

async function readData() {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      if (!paused) {
        const text = decoder.decode(value);
        processCanData(text);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function processCanData(data) {
  const includeDate = document.getElementById('includeDate').checked;
  const lines = data.trim().split('\r');
  for (const line of lines) {
    if (line.startsWith('T') && line.length >= 11) {
      const id = line.substring(1, 9);
      const dgn = (parseInt(id.substring(1, 2), 16) & 1).toString(16) + id.substring(2, 6);
      const sourceAddress = id.substring(6, 8);
      const payload = line.substring(10);

      if (!sourceAddresses[sourceAddress]) {
        sourceAddresses[sourceAddress] = { count: 0, show: true };
      }
      sourceAddresses[sourceAddress].count++;
      updateSourceTable();

      let now = new Date();
      let yyyy = now.getFullYear();
      let mm = String(now.getMonth() + 1).padStart(2, '0'); // Months start at 0!
      let dd = String(now.getDate()).padStart(2, '0');
      let hh = String(now.getHours()).padStart(2, '0');
      let min = String(now.getMinutes()).padStart(2, '0');
      let ss = String(now.getSeconds()).padStart(2, '0');
      let ms = String(now.getMilliseconds()).padStart(3, '0');
      let datePart = includeDate ? `${yyyy}-${mm}-${dd} ` : '';
      let timePart = `${hh}:${min}:${ss}.${ms}`;
      let timestamp = datePart + timePart;
      let logEntry = [timestamp, id, dgn, sourceAddress, payload];
      let logEntryMulti = [timestamp, id, dgn, sourceAddress, payload];

      const packet = packetsOfInterest.find(p => (parseInt(dgn, 16) & parseInt(p.dgn_mask, 16)) === parseInt(p.dgn_filter, 16));
      if (packet && sourceAddresses[sourceAddress].show) {
        logEntry.push(packet.name);
        const params = packet.parameters.map(param => {
          const value = extractParameter(logEntry[4], param.start_bit, param.length);
          const translatedValue = param.translations ? param.translations[value] : value;
          return `${param.name}: ${translatedValue}`;
        }).join(', ');
        logEntry.push(params);
        addLogEntryToTable(logEntry, packet.text_color, packet.background_color);
      } else if (showUnparsedCheckbox.checked && sourceAddresses[sourceAddress].show) {
        logEntry.push('');
        logEntry.push('');
        addLogEntryToTable(logEntry);
      } else {
        continue; // Skip logging this entry if showUnparsed is not checked
      }

      //processLogEntry(logEntry, dgn, sourceAddress);

      // Handle multi-packet data
      if (dgn === '0ECFF') {  // Initial packet
        handleInitialPacket(id, payload);
      } else if (dgn === '0EBFF') {  // Subsequent packets
        const completePayload = processMultiPacketData(id, payload);
        if (completePayload) {
          let logEntryMulti = [timestamp, id, '0FEEB', sourceAddress, completePayload, 'PRODUCT_ID'];
          const params = packet.parameters.map(param => {
            const value = extractParameter(logEntryMulti[4], param.start_bit, param.length);
            const translatedValue = param.translations ? param.translations[value] : value;
            return `${param.name}: ${translatedValue}`;
          }).join(', ');
          logEntryMulti.push(params);
          addLogEntryToTable(logEntryMulti, "#666666", "#333333");
        }
      }
    }
  }
}

function handleInitialPacket(id, payload) {
  const length = parseInt(payload.substring(2, 6), 16);
  const packetCount = parseInt(payload.substring(6, 8), 16);
  const dgn = payload.substring(10, 15);

  if ('0FEEB' !== dgn) return; // Only handle product ID multi-packets

  multiPacketBuffer[id] = {
    packets: Array(packetCount).fill(null),
    received: 1,
    total: packetCount,
    length,
    data
  };

  multiPacketBuffer[id].packets[0] = data;
}

function processMultiPacketData(id, payload) {
  const packetNum = parseInt(payload.substring(0, 2), 16);
  const data = payload.substring(2);

  if (!multiPacketBuffer[id]) {
    multiPacketBuffer[id] = { packets: [], received: 0, total: null };
  }

  const buffer = multiPacketBuffer[id];
  buffer.packets[packetNum - 1] = data;
  buffer.received++;

  if (buffer.received === buffer.total) {
    const completePayload = buffer.packets.join('');
    delete multiPacketBuffer[id];
    return completePayload;
  }

  return null;
}

function addLogEntryToTable(logEntry, textColor = '', backgroundColor = '') {
  const row = document.createElement('tr');
  if (textColor) row.style.color = textColor;
  if (backgroundColor) row.style.backgroundColor = backgroundColor;
  logEntry.forEach(cellData => {
    const cell = document.createElement('td');
    cell.textContent = cellData;
    row.appendChild(cell);
  });
  logTable.appendChild(row);

  if (autoScrollCheckbox.checked) {
    document.getElementById('logContainer').scrollTop = document.getElementById('logContainer').scrollHeight;
  }
}

function extractParameter(payload, startBit, length) {
  const startByte = Math.floor(startBit / 8);
  const endByte = Math.ceil((startBit + length) / 8);
  const rawBytes = payload.substring(startByte * 2, endByte * 2);
  const rawBits = parseInt(rawBytes, 16).toString(2).padStart((endByte - startByte) * 8, '0');
  const paramBits = rawBits.substring(startBit % 8, (startBit % 8) + length);
  return parseInt(paramBits, 2);
}

function updateSourceTable() {
  sourceTable.innerHTML = '';
  const sortedAddresses = Object.entries(sourceAddresses).sort((a, b) => b[1].count - a[1].count);
  for (const [address, info] of sortedAddresses) {
    const row = document.createElement('tr');
    const addressCell = document.createElement('td');
    const countCell = document.createElement('td');
    const showCell = document.createElement('td');
    const showCheckbox = document.createElement('input');
    showCheckbox.type = 'checkbox';
    showCheckbox.checked = info.show;
    showCheckbox.addEventListener('change', () => {
      sourceAddresses[address].show = showCheckbox.checked;
    });

    addressCell.textContent = address;
    countCell.textContent = info.count;
    showCell.appendChild(showCheckbox);

    row.appendChild(addressCell);
    row.appendChild(countCell);
    row.appendChild(showCell);
    sourceTable.appendChild(row);
  }
}

function getCsvContent() {
  const rows = Array.from(logTable.querySelectorAll('tr'));
  const csvContent = rows.map(row => {
    const cols = Array.from(row.querySelectorAll('td')).map(td => td.textContent);
    return cols.join(',');
  }).join('\n');
  return csvContent;
}
