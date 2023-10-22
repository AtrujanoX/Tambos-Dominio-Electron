const { exec } = require("child_process");
//const ip = require("ip");
const dgram = require("node:dgram");
const { Buffer } = require("node:buffer");
const os = require("os");
const Evilscan = require("evilscan");
const { resolve } = require("path");

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
          timeout: 3000,
          status: "ROU",
          banner: true,
        };
        const evilscan = new Evilscan(options);
        evilscan.on("result", (data) => {
          this.handleNewIPDevice(data.ip);
          this.validateDevice(data.ip);
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
   * @returns {Promise<(string,string)|Error>}
   */
  handleNewIPDevice(ip) {
    return new Promise((resolve, reject) => {
      if (!this.discoveredDevices.includes(ip)) {
        this.discoveredDevices.push(ip);
        this.validateDevice(ip)
          .then(() => {
            console.log("Valid device found, retrieving mac address");
            this.getMacAddress(ip)
              .then((mac) => {
                resolve(ip, mac);
              })
              .catch((err) => {
                reject(new Error(`MAC address could not be retrieved: ${err}`));
              });
            this.discoveredDeviceCallback(ip);
          })
          .catch((err) => {
            reject(new Error(`Invalid device: ${err}`));
          });
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
    //this.loadSaved();
  }

  clearKnownDevices() {
    this.knownValidDevices = [];
    this.validDevices = [];
    this.failedKnownDevices = [];
  }

  loadSaved() {
    if (this.knownValidDevices.length > 0) {
      for (const dev of this.knownValidDevices) {
        if (this.validateDevice(dev)) {
          this.validDevices.push(dev);
          this.discoveredDeviceCallback(dev);
        } else {
          this.failedKnownDevices.push(dev);
        }
      }
    }

    if (this.failedKnownDevices.length > 0) {
      this.startDeviceRetrieval();
    }
  }

  startDeviceRetrieval() {
    const t = new Thread(this.run_device_retrieval, this.name);
    t.daemon = true;
    t.start();
  }

  run_device_retrieval() {
    while (this.failedKnownDevices.length > 0) {
      for (const dev of this.failedKnownDevices) {
        if (this.validateDevice(dev)) {
          const index = this.failedKnownDevices.indexOf(dev);
          this.failedKnownDevices.splice(index, 1);
          this.validDevices.push(dev);
          this.discoveredDeviceCallback(dev);
        }
      }
    }
  }

  // start_discovery() {
  //   this.isDiscovering = true;
  //   const t = new Thread(this.runDeviceDiscovery, this.name);
  //   t.daemon = true;
  //   t.start();
  // }

  // stop_discovery() {
  //   this.isDiscovering = false;
  // }

  // runDeviceDiscovery() {
  //   while (this.isDiscovering) {
  //     const devices = this.discoverDevices(
  //       this.subnet.networkAddress,
  //       this.subnet.numHosts
  //     );
  //     for (const device of devices) {
  //       const ip = device.ip;
  //       const mac = device.mac;
  //       if (!this.knownValidDevices.includes(ip)) {
  //         console.log(`New device discovered: IP=${ip}, MAC=${mac}`);
  //         this.knownValidDevices.push(ip);
  //         if (this.validateDevice(ip)) {
  //           this.validDevices.push(ip);
  //           this.discoveredDeviceCallback(ip);
  //         }
  //       }
  //     }

  //     sleep(30);
  //   }
  // }

  /**
   *
   * @param {string} ip
   * @returns {Promise<string|Error>}
   */
  getMacAddress(ip) {
    return new Promise((resolve, reject) => {
      let command;
      if (os.platform() === "win32") {
        command = `arp -a ${ip}`;
      } else if (os.platform() === "linux") {
        command = `arp ${ip}`;
      } else {
        reject(new Error("This OS is not supported."));
      }

      exec(command, (error, stdout) => {
        if (error) {
          reject(new Error("Error executing command"));
        } else {
          const regex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;
          const match = regex.exec(stdout);
          resolve(match ? match[0] : null);
        }
      });
    });
  }

  /**
   *
   * @param {string} ip
   * @returns {Promise<null|Error>}
   */
  async validateDevice(ip) {
    return new Promise(async (resolve, reject) => {
      const message = Buffer.from("PING");
      const socket = await dgram.createSocket("udp4");
      socket.send(message, this.port, ip, (err, bytes) => {});
      socket.on("message", (msg, rinfo) => {
        //console.log(rinfo);
        let message = msg.toString();
        if (message == "PONG") {
          //console.log("PONG");
          socket.close();
          resolve();
        }
      });
      socket.on("error", (err) => {
        socket.close();
        reject(new Error(`Device returned error: ${err}`));
      });
    });
  }
}

module.exports = DeviceScanner;

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
