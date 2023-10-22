const dgram = require('dgram');

class CentralUDPServer {
  constructor(port) {
    this.port = port;
    this.udpServer = dgram.createSocket('udp4');

    this.udpServer.on('message', (msg, rinfo) => {
      // Identify the source based on the message content
      const source = this.identifySource(msg);
      console.log(`Received message from ${source} at ${rinfo.address}:${rinfo.port}: ${msg}`);
      // Handle the message from the identified source
    });

    this.udpServer.on('error', (err) => {
      console.error(`UDP server error:\n${err.stack}`);
      this.udpServer.close();
    });
  }

  identifySource(msg) {
    // Implement logic to extract source information from the message content
    // You might include a specific identifier in the message payload
    return 'ArduinoX'; // Replace with actual source identification logic
  }

  start() {
    this.udpServer.bind(this.port);
  }

  stop() {
    this.udpServer.close(() => {
      console.log('UDP server is closed');
    });
  }
}

module.exports = CentralUDPServer;