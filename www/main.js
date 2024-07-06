import { initializeUI, handleFileUpload } from './ui.js';
import { connect, disconnect, sendCommand, readData } from './serial.js';
import { loadDefaultPackets } from './packets.js';

// Initialize UI elements and event listeners
initializeUI();

// Load the default JSON file
loadDefaultPackets();

// Set up event listeners for buttons
document.getElementById('connectButton').addEventListener('click', connect);
document.getElementById('disconnectButton').addEventListener('click', disconnect);
document.getElementById('sendButton').addEventListener('click', sendCommand);
document.getElementById('clearButton').addEventListener('click', () => {
  document.getElementById('logTable').querySelector('tbody').innerHTML = '';
  window.sourceAddresses = {};
  updateSourceTable();
});
document.getElementById('exportCsvButton').addEventListener('click', () => {
  const csvContent = getCsvContent();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RVC_Log.csv';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('pauseButton').addEventListener('click', () => {
  window.paused = !window.paused;
  document.getElementById('pauseButton').textContent = window.paused ? 'Resume' : 'Pause';
});
document.getElementById('fileInput').addEventListener('change', handleFileUpload);


function loadDefaultPackets() {
    fetch('rvc.json')
      .then(response => response.json())
      .then(data => {
        window.packetsOfInterest = data.packets;
        document.getElementById('uploadStatus').textContent = `${window.packetsOfInterest.length} packet types defined from default rvc.json:`;
        generatePacketDefinitionsTable(window.packetsOfInterest);
      })
      .catch(error => {
        document.getElementById('uploadStatus').textContent = 'Error loading default JSON';
        console.error('Error loading default JSON:', error);
      });
  }