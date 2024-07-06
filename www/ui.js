export function initializeUI() {
    window.sourceAddresses = {};
    window.paused = false;
  }
  
  export function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          window.packetsOfInterest = data.packets;
          document.getElementById('uploadStatus').textContent = `${window.packetsOfInterest.length} packet types defined from uploaded JSON:`;
          generatePacketDefinitionsTable(window.packetsOfInterest);
        } catch (error) {
          document.getElementById('uploadStatus').textContent = 'Error parsing JSON';
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  }
  
  export function generatePacketDefinitionsTable(packets) {
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
  