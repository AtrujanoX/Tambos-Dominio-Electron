const { exec } = require("child_process");
const dgram = require("node:dgram");
const { Buffer } = require("node:buffer");
const os = require("os");
const Evilscan = require("evilscan");

class Device {
  constructor(ip, mac) {
    this.ip = ip;
    this.mac = mac;
    this.deviceUpdateCallbacks = [];
    this.socket = null;
    this.initDevice().then((socket)=>{
    });
  }

  /**
   * 
   * @returns {Promise<dgram.Socket>}  A promise
   */
  initDevice() {
    return new Promise(async (resolve, reject) => {
      const message = Buffer.from("PING");
      const socket = await dgram.createSocket("udp4");
      socket.send(message, this.port, this.ip, (err, bytes) => {});
      socket.on("message", (msg, rinfo) => {
        console.log(rinfo);
        let message = msg.toString();
        if (message == "PONG") {
          console.log("PONG");
          resolve(socket);
          socket.close();
        }
      });
      socket.on("error", (err) => {
        socket.close();
        reject(new Error(`Device returned error: ${err}`));
      });
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
    this.loadSaved();
  }
}

module.exports = Device;

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
