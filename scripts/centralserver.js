const dgram = require("dgram");
const Device = require("./device");

const Teams = {
  red: "red",
  blue: "blue",
  none: "none",
};

class CentralUDPServer {
  /**
   *
   * @param {number} port
   */
  constructor(port) {
    this.port = port;
    this.udpServer = dgram.createSocket("udp4");
    /**
     * @type {Device[]}
     */
    this.devices = [];
    this.newDeviceCallbacks = [];
    this.deviceUpdateCallbacks = [];
    this.udpServer.on("message", this.handleMessage);
    this.udpServer.on("error", (err) => {
      console.error(`UDP server error:\n${err.stack}`);
      this.udpServer.close();
    });
  }

  handleMessage = (msgArray, rinfo) => {
    // Identify the source based on the message content
    const msg = msgArray.toString();
    if (msg == "PING") return;
    if (msg == "PONG") {
      this.registerNewDevice(rinfo.address);
    } else {
      this.identifySource(rinfo)
        .then((dev) => {
          dev.processMessage(msg);
          //KNOWN DEVICE
          console.log(
            `Received message from known ${dev.id} at ${rinfo.address}:${rinfo.port}: ${msg}`
          );
        })
        .catch((err) => {
          //UNKNOWN DEVICE
          console.warn(
            `Received message from unknown ${rinfo.address}:${rinfo.port}: ${msg}`
          );
        });
      console.log();
    }
  };

  registerNewDeviceCallback(callback) {
    this.newDeviceCallbacks.push(callback);
  }

  registerDeviceUpdateCallbacks(callback) {
    this.deviceUpdateCallbacks.push(callback);
  }

  /**
   * @private
   * @param {string} ip
   */
  registerNewDevice(ip) {
    let dev = new Device(ip, this.port);
    dev.registerSendCommandCallback(this.onCommandRequested);
    dev.registerDeviceUpdateCallback(this.onDeviceUpdated);
    this.devices.push(dev);
    this.udpServer.send("GETID", this.port, ip);
    this.newDeviceCallbacks.forEach((cb) => {
      cb(dev);
    });
    dev.updateCard();
    console.log(`New device registered ${ip}`);
  }

  /**
   * @private
   * @param {Device} dev
   * @param {string} cmd
   */
  onCommandRequested = (dev, cmd) => {
    this.udpServer.send(cmd, dev.port, dev.ip);
  };

  /**
   * @param {Device} dev
   */
  onDeviceUpdated = (dev) => {
    this.deviceUpdateCallbacks.forEach((cb) => {
      cb(dev);
    });
  };

  resetAllDevices(){
    this.devices.forEach((dev)=>{
      dev.reset();
    })
  }

  /**
   * @private
   * @param {dgram.RemoteInfo} rinfo
   * @returns {Promise<Device>}
   */
  identifySource(rinfo) {
    return new Promise((resolve, reject) => {
      this.devices.forEach((dev) => {
        if (dev.ip == rinfo.address) {
          resolve(dev);
        }
      });
      reject(new Error("No device found or initialized yet"));
    });
  }

  /**
   * @public
   * @param {string} ip
   */
  addDiscoveredDevice(ip) {
    this.udpServer.send("PING", this.port, ip);
  }

  /**
   * @public
   */
  start() {
    this.udpServer.bind(this.port);
  }

  /**
   * @public
   */
  stop() {
    this.udpServer.close(() => {
      console.log("UDP server is closed");
    });
  }
}

module.exports = CentralUDPServer;
