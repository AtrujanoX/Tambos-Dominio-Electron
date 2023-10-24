const dgram = require("node:dgram");
const { Buffer } = require("node:buffer");
const os = require("os");
const Evilscan = require("evilscan");

class DeviceScanner {
  constructor(port, savedDevices) {
    this.port = port;
    this.failedKnownDevices = [];
    this.discoveredDevices = [];
    this.knownValidDevices = savedDevices || [];
    this.validDevices = [];
    this.discoveredDeviceCallback = null;
    this.ipRange = "";
    this.isDiscovering = false;
  }

  /**
   *
   * @returns {Promise<string[]|Error>}
   */
  getNetworkInterfaces() {
    return new Promise((resolve, reject) => {
      console.log("Getting local IP");
      var interfaces = os.networkInterfaces();
      var addresses = [];
      for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
          var address = interfaces[k][k2];
          if (address.family === "IPv4" && !address.internal) {
            addresses.push(address.address);
          }
        }
      }

      if (addresses.length > 0) {
        resolve(addresses);
      } else {
        reject(new Error("No valid IPv4 adresses found"));
      }
    });
  }

  /**
   * Looks for every device in all IPv4 interfaces, if any of them ports is rejected, open, or
   * unreachable it counts as a device and tries to validate the device for a board to be existing there.
   * @returns {void}
   */
  getDevicesInNetwork() {
    this.getNetworkInterfaces()
      .then((addresses) => {
        console.log(`Found ${addresses.length} network interfaces`);
        const filter = /(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}/;
        let adr = addresses[0].match(filter)[1] + ".0/24";
        console.log(`Scanning for adresses in ${adr} interface.`);
        const options = {
          target: adr,
          port: this.port,
          timeout: 3500,
          status: "ROU",
          banner: true,
        };
        const evilscan = new Evilscan(options);
        evilscan.on("result", (data) => {
          this.handleNewIPDevice(data.ip).then((ip)=>{
            console.log(`Sending new Device `)
            console.log(data);
            this.discoveredDeviceCallback(ip);
          });
        });
        evilscan.on("error", (err) => {
          console.log(err);
        });
        evilscan.on("done", () => {
          //Seguimos buscando interfaces?
          //evilscan.run();
        });
        evilscan.run();
      })
      .catch((err) => {
        console.log(`Error: ${err}`);
      });
  }

  /**
   *
   * @param {string} ip
   * @returns {Promise<string|Error>}
   */
  handleNewIPDevice(ip) {
    return new Promise((resolve) => {
      if (!this.discoveredDevices.includes(ip)) {
        this.discoveredDevices.push(ip);
        this.discoveredDeviceCallback(ip);
        resolve(ip);
      }
    });
  }

  /**
   * Register a callback function to handle discovered devices.
   *
   * @param {function} callback - The callback function to be invoked when a device is discovered.
   * @returns {void}
   */
  registerDiscoveredDeviceCallback(callback) {
    this.discoveredDeviceCallback = callback;
  }

  clearKnownDevices() {
    this.knownValidDevices = [];
    this.validDevices = [];
    this.failedKnownDevices = [];
  }
}

module.exports = DeviceScanner;

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
