const { exec } = require("child_process");
//const ip = require("ip");
const dgram = require("node:dgram");
const { Buffer } = require("node:buffer");

const os = require("os");
const Evilscan = require("evilscan");

class DeviceScanner {
  constructor(port, savedDevices, name = "DeviceScanner") {
    this.port = port;
    this.name = name;
    this.failed_known_devices = [];
    this.known_devices = savedDevices || [];
    this.valid_devices = [];
    this.discovered_device_callback = null;
    this.ip_range = "";
    this.isDiscovering = false;

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
      const filter = /(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}/;

      const options = {
        target: "192.168.1.0/24",
        port: this.port,
        timeout: 3000,
        status: "ROU",
        banner: true,
      };

      const evilscan = new Evilscan(options);

      evilscan.on("result", (data) => {
        console.log(data);
        this.check_udp_port(data.ip);
      });
      evilscan.on("error", (err) => {
        console.log(err);
      });
      evilscan.on("done", () => {
        //
      });
      evilscan.run();
    }
  }

  register_discovered_device_callback(callback) {
    this.discovered_device_callback = callback;
    this.loadSaved();
  }

  clear_known_devices() {
    this.known_devices = [];
    this.valid_devices = [];
    this.failed_known_devices = [];
  }

  loadSaved() {
    if (this.known_devices.length > 0) {
      for (const dev of this.known_devices) {
        if (this.check_udp_port(dev)) {
          this.valid_devices.push(dev);
          this.discovered_device_callback(dev);
        } else {
          this.failed_known_devices.push(dev);
        }
      }
    }

    if (this.failed_known_devices.length > 0) {
      this.start_device_retrieval();
    }
  }

  get_local_ip_and_subnet() {
    return {
      local_ip: this.local_ip,
      subnet: this.subnet,
    };
  }

  start_device_retrieval() {
    const t = new Thread(this.run_device_retrieval, this.name);
    t.daemon = true;
    t.start();
  }

  run_device_retrieval() {
    while (this.failed_known_devices.length > 0) {
      for (const dev of this.failed_known_devices) {
        if (this.check_udp_port(dev)) {
          const index = this.failed_known_devices.indexOf(dev);
          this.failed_known_devices.splice(index, 1);
          this.valid_devices.push(dev);
          this.discovered_device_callback(dev);
        }
      }
    }
  }

  start_discovery() {
    this.isDiscovering = true;
    const t = new Thread(this.run_device_discovery, this.name);
    t.daemon = true;
    t.start();
  }

  stop_discovery() {
    this.isDiscovering = false;
  }

  run_device_discovery() {
    while (this.isDiscovering) {
      const devices = this.discover_devices(
        this.subnet.networkAddress,
        this.subnet.numHosts
      );
      for (const device of devices) {
        const ip = device.ip;
        const mac = device.mac;
        if (!this.known_devices.includes(ip)) {
          console.log(`New device discovered: IP=${ip}, MAC=${mac}`);
          this.known_devices.push(ip);
          if (this.check_udp_port(ip)) {
            this.valid_devices.push(ip);
            this.discovered_device_callback(ip);
          }
        }
      }

      sleep(30);
    }
  }

  discover_devices(ip, numHosts) {
    const devices = [];
    let currentHost = 1;
    while (currentHost <= numHosts) {
      const host = ip.split(".").slice(0, 3).join(".") + "." + currentHost;
      const mac = this.get_mac_address(host);
      if (mac) {
        devices.push({ ip: host, mac });
      }

      currentHost++;
    }

    return devices;
  }

  get_mac_address(ip) {
    return new Promise((resolve) => {
      exec(`arp -n ${ip}`, (error, stdout) => {
        if (error) {
          resolve(null);
        } else {
          const regex = /(([a-f\d]{1,2}\:){5}[a-f\d]{1,2})/gi;
          const match = regex.exec(stdout);
          resolve(match ? match[0] : null);
        }
      });
    });
  }

  async check_udp_port(ip) {
    const message = Buffer.from("PING");
    const socket = await  dgram.createSocket("udp4");
    socket.send(message, this.port, ip, (err, bytes) => {
      // console.log(err);
      // console.log(bytes);
    });
    socket.on('message', (msg, rinfo)=>{
      let message = msg.toString();
      if(message == "PONG"){
        console.log("PONG");
        
      }
    })
    socket.on('error', (err)=>{
      console.log(err);
    })
  }
}

module.exports = DeviceScanner;

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// check_udp_port(ip) {
//   const sock = dgram.createSocket("udp4");
//   sock.setTimeout(2000);
//   return new Promise((resolve) => {
//     sock.send("PING", this.port, ip, () => {
//       sock.on("message", (data) => {
//         if (data.toString().includes("PONG")) {
//           console.log(`UDP port ${this.port} is open on ${ip}`);
//           resolve(true);
//         } else {
//           console.log(`Unexpected response from ${ip}:${this.port}`);
//           resolve(false);
//         }

//         sock.close();
//       });
//     });
//   });
// }
