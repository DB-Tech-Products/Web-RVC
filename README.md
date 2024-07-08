# Web RV-C Tool

The RV-C Tool is a web-based application designed to interact with RV-C (Recreational Vehicle-CAN) networks using a USB-CAN adapter running SLCAN. This tool allows users to send and receive data packets over the CAN network, visualize incoming data in a tabular format, and export logs to CSV files for further analysis.

## Features

- **No Install Needed**: Run in any browser with Web Serial support.
- **Send CAN Packets**: Send custom CAN packets by specifying priority, DGN, source address, and payload.
- **Receive CAN Packets**: View incoming CAN packets in real-time with timestamp, ID, DGN, source address, and payload information.
- **Packet Parsing**: Automatically parse and display packets based on user-defined JSON configurations.
- **Log Management**: Clear logs, pause/resume data reception, and export logs to CSV files.
- **Source Address Tracking**: Track and display source addresses and packet counts.
- **Customizable Display**: Configure auto-scroll and show/hide unparsed packets.
- **Dark/Light Mode Support**: Respects the browser's dark/light mode settings.
- ~~**Multi-Packet Handling**: Support for receiving and assembling multi-packet messages.~~

## Usage

### Connecting to the CAN Network

1. Connect your USB-CAN adapter to the PC.
2. Click the "Connect" button to initiate the connection. The tool will set the CAN bit rate to 250000 and open the CAN channel.

### Sending CAN Packets

1. Enter the desired priority, DGN (5 hex digits starting with 0 or 1), source address (2 hex digits), and payload (hex).
2. Click "Send" to transmit the packet.

### Receiving CAN Packets

- Incoming packets will be displayed in the log table with details such as timestamp, ID, DGN, source address, payload, packet name, and parsed parameters.

### Managing Logs

- **Clear**: Clear the current log entries.
- **Pause/Resume**: Pause or resume the data reception.
- **Export to CSV**: Export the current log entries to a CSV file named `RVC_Log.csv`.

### Custom Packet Parsing

1. Upload a JSON file defining packets of interest by clicking the file input button.
2. The JSON file should contain packet definitions with fields for filtering, parameters, and optional color schemes.
3. Successfully loaded packet types will be displayed below the upload button.

### Example JSON Configuration

```json
{
  "packets": [
    {
      "name": "ACKNOWLEDGMENT",
      "dgn_filter": "0x0E800",
      "dgn_mask": "0x1FF00",
      "text_color": "#000000",
      "background_color": "#FFD700",
      "parameters": [
        {"name": "ackCode", "start_bit": 0, "length": 8},
        {"name": "instance", "start_bit": 8, "length": 8},
        {"name": "instanceBank", "start_bit": 16, "length": 4},
        {"name": "reservedBits1", "start_bit": 20, "length": 4},
        {"name": "reserved", "start_bit": 24, "length": 8},
        {"name": "sourceAddress", "start_bit": 32, "length": 8},
        {"name": "DGN_LSB", "start_bit": 40, "length": 8},
        {"name": "DGN_ISB", "start_bit": 48, "length": 8},
        {"name": "DGN_MSB", "start_bit": 56, "length": 1},
        {"name": "reservedBits2", "start_bit": 57, "length": 7}
      ],
      "translations": {
        "ackCode": {
          "0": "ACK",
          "1": "NAK_GENERIC",
          "2": "NAK_DENIED",
          "3": "NAK_CANT_RESP",
          "4": "NAK_CMD_FORMAT",
          "5": "NAK_RANGE",
          "6": "NAK_PASSWORD",
          "7": "NAK_MORE_TIME",
          "8": "NAK_USER_OVR"
        }
      }
    }
  ]
}
```

## Development

To contribute to this project, please fork the repository and create a pull request. Ensure your code adheres to the existing style and include relevant tests where applicable.

## License

This project is licensed under the [TBD] License. See the LICENSE file for details.
