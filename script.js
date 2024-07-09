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
const toggleDebugCheckbox = document.getElementById('toggleDebugCheckbox');

let serial;
let paused = false;
let sourceAddresses = {};
let packetsOfInterest = [];
let debug = false;

toggleDebugCheckbox.addEventListener('change', () => {
  debug = toggleDebugCheckbox.checked;
  console.log(`Debug mode is now ${debug ? 'on' : 'off'}`);
});

// Load the appropriate serial module
if (/Mobi|Android/i.test(navigator.userAgent)) {
  import('./serial-mobile.js').then(module => {
    serial = module;
    if (debug) console.log("Loaded serial-mobile.js");
    initializeApp();
  }).catch(error => console.error("Error loading serial-mobile.js:", error));
} else {
  import('./serial.js').then(module => {
    serial = module;
    if (debug) console.log("Loaded serial.js");
    initializeApp();
  }).catch(error => console.error("Error loading serial.js:", error));
}

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

function initializeApp() {
  if (debug) console.log("Initializing app");
  connectButton.addEventListener('click', async () => {
    try {
      await serial.connect(debug);
      if (debug) console.log("Connected to serial port");

      document.title = 'RV-C Tool: Connected';
      serial.readData(processCanData, debug);

      connectButton.disabled = true;
      disconnectButton.disabled = false;
      sendButton.disabled = false;
      pauseButton.disabled = false;
    } catch (error) {
      document.title = 'RV-C Tool: Error Connecting';
      console.error('Error:', error);
    }
  });

  disconnectButton.addEventListener('click', async () => {
    try {
      await serial.disconnect(debug);
      if (debug) console.log("Disconnected from serial port");
      document.title = 'RV-C Tool: Disconnected';

      connectButton.disabled = false;
      disconnectButton.disabled = true;
      sendButton.disabled = true;
      pauseButton.disabled = true;
    } catch (error) {
      document.title = 'RV-C Tool: Error Disconnecting';
      console.error('Error:', error);
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

    await serial.send(command, debug);
    if (debug) console.log(`Sent command: ${command}`);
    dgnInput.value = '';
    sourceAddrInput.value = '';
    payloadInput.value = '';
  });

  clearButton.addEventListener('click', () => {
    logTable.innerHTML = '';
    for (const address in sourceAddresses) {
      sourceAddresses[address].count = 0;
      sourceAddresses[address].dgns = {};
    }
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
}

function processCanData(data) {
  if (debug) console.log("Processing CAN data:", data);
  const includeDate = document.getElementById('includeDate').checked;
  const lines = data.trim().split('\r');
  if (debug) console.log("CAN data lines:", lines);
  for (const line of lines) {
    if (line.startsWith('T') && line.length >= 11) {
      if (debug) console.log("Processing line:", line);
      const id = line.substring(1, 9);
      const dgn = (parseInt(id.substring(1, 2), 16) & 1).toString(16) + id.substring(2, 6);
      const sourceAddress = id.substring(6, 8);
      const payload = line.substring(10);

      if (!sourceAddresses[sourceAddress]) {
        sourceAddresses[sourceAddress] = { count: 0, show: true, dgns: {} };
      }
      sourceAddresses[sourceAddress].count++;
      if (!sourceAddresses[sourceAddress].dgns[dgn]) {
        sourceAddresses[sourceAddress].dgns[dgn] = 0;
      }
      sourceAddresses[sourceAddress].dgns[dgn]++;
      updateSourceTable();

      if (paused) continue; // Check if paused

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

      const packet = packetsOfInterest.find(p => (parseInt(dgn, 16) & parseInt(p.dgn_mask, 16)) === parseInt(p.dgn_filter, 16));
      if (packet && sourceAddresses[sourceAddress].show) {
        logEntry.push(packet.name);
        if (payload.length !== 16) { // Bold the payload for non-8-byte packets
          logEntry[4] = `<b>${payload}</b>`;
          logEntry.push(''); // Leave the parameters column blank
          addLogEntryToTable(logEntry, packet.text_color, packet.background_color, true);
        } else {
          const params = packet.parameters.map(param => {
            const value = extractParameter(payload, param.start_bit, param.length);
            const translatedValue = param.translations ? param.translations[value] : value;
            return `${param.name}: ${translatedValue}`;
          }).join(', ');
          logEntry.push(params);
          addLogEntryToTable(logEntry, packet.text_color, packet.background_color);
        }
      } else if (showUnparsedCheckbox.checked && sourceAddresses[sourceAddress].show) {
        logEntry.push('');
        logEntry.push('');
        addLogEntryToTable(logEntry);
      } else {
        continue; // Skip logging this entry if showUnparsed is not checked
      }
    } else {
      if (debug) console.log("Ignoring line:", line);
    }
  }
}

function addLogEntryToTable(logEntry, textColor = '', backgroundColor = '', isNon8BytePayload = false) {
  if (debug) console.log("Adding log entry:", logEntry);
  const row = document.createElement('tr');
  if (textColor) row.style.color = textColor;
  if (backgroundColor) row.style.backgroundColor = backgroundColor;
  logEntry.forEach((cellData, index) => {
    const cell = document.createElement('td');
    cell.innerHTML = cellData;
    if (isNon8BytePayload && index === logEntry.length - 1) {
      // Match the background color of the last cell with the page background
      cell.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
    }
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
  if (debug) console.log("Updating source table");
  sourceTable.innerHTML = '';
  const sortedAddresses = Object.entries(sourceAddresses).sort((a, b) => b[1].count - a[1].count);
  for (const [address, info] of sortedAddresses) {
    const row = document.createElement('tr');
    const addressCell = document.createElement('td');
    const countCell = document.createElement('td');
    const dgnsCell = document.createElement('td');
    const showCell = document.createElement('td');
    const showCheckbox = document.createElement('input');
    showCheckbox.type = 'checkbox';
    showCheckbox.checked = info.show;
    showCheckbox.addEventListener('change', () => {
      sourceAddresses[address].show = showCheckbox.checked;
    });

    const dgns = Object.entries(info.dgns).map(([dgn, count]) => `${dgn} (${count})`).join(', ');

    addressCell.textContent = address;
    countCell.textContent = info.count;
    dgnsCell.textContent = dgns;
    showCell.appendChild(showCheckbox);

    row.appendChild(addressCell);
    row.appendChild(showCell);
    row.appendChild(countCell);
    row.appendChild(dgnsCell);
    sourceTable.appendChild(row);
  }
}

function getCsvContent() {
  if (debug) console.log("Generating CSV content");
  const rows = Array.from(logTable.querySelectorAll('tr'));
  const csvContent = rows.map(row => {
    const cols = Array.from(row.querySelectorAll('td')).map(td => td.textContent);
    return cols.join(',');
  }).join('\n');
  return csvContent;
}
