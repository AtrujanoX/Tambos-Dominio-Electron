const { ipcRenderer } = require("electron");

const fs = require("fs");
const DeviceScanner = require("./scripts/devicescanner");
const Device = require("./scripts/device");
const CentralUDPServer = require("./scripts/centralserver");
const os = require("os");

document.addEventListener("DOMContentLoaded", () => {
  const btnStart = document
    .querySelector("#btnStart")
    .addEventListener("click", () => {
      console.log("START");
    });
  const btnStop = document
    .querySelector("#btnStop")
    .addEventListener("click", () => {
      console.log("STOP");
    });
  const btnReset = document
    .querySelector("#btnReset")
    .addEventListener("click", () => {
      console.log("RESET");
    });
  const btnResetAll = document
    .querySelector("#btnResetAll")
    .addEventListener("click", () => {
      console.log("btnResetAll");
    });
  const btnDiscoverDevs = document
    .querySelector("#btnDiscoverDevs")
    .addEventListener("click", () => {
      console.log("btnDiscoverDevs");
      scanner.getDevicesInNetwork();
    });
  const btnClearDevsList = document
    .querySelector("#btnClearDevsList")
    .addEventListener("click", () => {
      console.log("btnClearDevsList");
    });

  const scanner = new DeviceScanner(8632, []);
  scanner.registerDiscoveredDeviceCallback(onNewDevice);
  
  const centralserver = new CentralUDPServer(8632);
  centralserver.start();
  /*
  getCfg("time", 60).then((v) => {
    const tiempo = document.querySelector("#quantity");
    this.tiempoRonda = v;
    tiempo.value = v;
  });*/
});

function onNewDevice(device) {
  console.log(`Discovered device: ${device}`);

  //document.getElementById("takePictureButton").style.display = "block";

  /*  arduino = new Device("arduino", port);
  arduino.registerDeviceUpdateCallback(onArduinoDataUpdated);*/
}

function onDeviceUpdate(_points, _mistakes) {
  console.log("updated", _points, _mistakes);
  points = _points;
  mistakes = _mistakes;
}

configActive = true;
function toggleConfigPanel(active) {
  if (active) {
    document.getElementById("configPanel").style.display = "block";
  } else {
    document.getElementById("configPanel").style.display = "none";
  }
}

function configTimeAdd() {
  const tiempo = document.querySelector("#quantity");
  v = parseInt(tiempo.value) + 10;
  tiempo.value = v;
  console.log(v);
  this.tiempoRonda = v;
  setCfg("time", v);
}

function configTimeSub() {
  const tiempo = document.querySelector("#quantity");

  v = parseInt(tiempo.value) - 10;
  if (v <= 0) v = 10;
  tiempo.value = v;
  this.tiempoRonda = v;
  setCfg("time", v);
}

function showCameraPanel() {
  document.getElementById("teclado").style.display = "none";
  document.getElementById("camara").style.display = "block";
  document.getElementById("counter").style.display = "none";
  document.getElementById("score").style.display = "none";
  arduino.reset();
  uuid = null;
  points = 0;
  mistakes = 0;
  document.getElementById("takePictureButton").style.display = "block";
  document.getElementById("photo").style.display = "none";
  document.getElementById("empezar").style.display = "none";
}

function showGamePanel() {
  document.getElementById("teclado").style.display = "none";
  document.getElementById("camara").style.display = "none";
  document.getElementById("counter").style.display = "block";
  document.getElementById("score").style.display = "none";

  //JALO CAMPOS
  this.pointsText = document.querySelector("#buenas");
  this.mistakesText = document.querySelector("#malas");
  this.countdownText = document.querySelector("#countdown");
  this.tiempoText = document.querySelector("#tiempo");

  document.getElementById("countdown").style.display = "block";
  this.pointsText.textContent = "00";
  this.mistakesText.textContent = "00";
  this.countdownText.textContent = "3";

  //INICIO TEMPORIZADOR
  let countdownValue = 3;
  const countdownInterval = setInterval(() => {
    countdownValue--;
    this.countdownText.textContent = countdownValue.toString();
    if (countdownValue === 0) {
      clearInterval(countdownInterval);
      document.getElementById("countdown").style.display = "none";
      arduino.startRun();
      this.targetTime = Date.now() + this.tiempoRonda * 1000;
      this.tiempoText.textContent = "01:00.00";
      updateCountdown();
    }
  }, 1000);
}

function updateCountdown() {
  const currentTime = Date.now();
  const remainingTime = Math.max(this.targetTime - currentTime, 0);
  const minutes = Math.floor((remainingTime / 1000 / 60) % 60);
  const seconds = Math.floor((remainingTime / 1000) % 60);
  const milliseconds = Math.floor((remainingTime % 1000) / 10);
  const formattedTime = `${padTimeComponent(minutes)}:${padTimeComponent(
    seconds
  )}.${padTimeComponent(milliseconds, 2)}`;
  this.tiempoText.textContent = formattedTime;
  this.pointsText.textContent = points;
  this.mistakesText.textContent = mistakes;

  if (remainingTime <= 0) {
    console.log("Countdown complete!");
    arduino.reset();
    showKeyboardPanel();
  } else {
    setTimeout(updateCountdown, 10);
  }
}

function padTimeComponent(value, length = 2) {
  return value.toString().padStart(length, "0");
}

function showKeyboardPanel() {
  document.getElementById("teclado").style.display = "block";
  document.getElementById("camara").style.display = "none";
  document.getElementById("counter").style.display = "none";
  document.getElementById("score").style.display = "none";

  const nombre = document.querySelector("#nombre");
  nombre.value = "";
  const saveButton = document.querySelector("#saveBtn");
  saveButton.addEventListener("click", () => {
    updateDB(uuid, nombre.value).then(() => {
      showScorePanel();
    });
  });
}

function showScorePanel() {
  document.getElementById("teclado").style.display = "none";
  document.getElementById("camara").style.display = "none";
  document.getElementById("counter").style.display = "none";
  document.getElementById("score").style.display = "block";

  readDB().then((db) => {
    // Sort the database by points in descending order
    db.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points; // Sort by points in descending order
      } else {
        return a.mistakes - b.mistakes; // For entries with the same points, sort by mistakes in ascending order
      }
    });

    // Get the top 10 entries
    const topEntries = db.slice(0, 10);

    const tableBody = document.querySelector("#data-table tbody");
    tableBody.innerHTML = ""; // Clear the table body

    topEntries.forEach((item) => {
      const row = document.createElement("tr");

      const imageDataCell = document.createElement("td");

      const maskDiv = document.createElement("div");
      maskDiv.className = "mask1";
      imageDataCell.appendChild(maskDiv);

      const imageElement = document.createElement("img");
      imageElement.src = item.imageData;
      imageElement.width = 50;
      imageElement.height = 50;
      maskDiv.appendChild(imageElement);

      row.appendChild(imageDataCell);

      const nameCell = document.createElement("td");
      nameCell.textContent = item.name;
      row.appendChild(nameCell);

      const pointsCell = document.createElement("td");
      pointsCell.textContent = item.points;
      row.appendChild(pointsCell);

      const mistakesCell = document.createElement("td");
      mistakesCell.textContent = item.mistakes;
      row.appendChild(mistakesCell);

      tableBody.appendChild(row);
    });
  });
}

function getCfg(key, defaultValue) {
  return new Promise((resolve, reject) => {
    const dbPath = "data/";
    const dbName = "config.json";
    fs.readFile(dbPath + dbName, (err, fileData) => {
      if (err) {
        console.log("ERROR READING");
        if (err.code === "ENOENT") {
          const config = { time: 60 };
          fs.writeFileSync(dbPath + dbName, JSON.stringify(config, null, 2));
          resolve(defaultValue);
        } else {
          console.error("Error reading config file:", error);
          resolve(defaultValue);
        }
      }

      try {
        const config = JSON.parse(fileData);
        if (config)
          if (config[key] >= 0) resolve(config[key]);
          else resolve(defaultValue);
      } catch (error) {
        console.error("Error parsing database file:", error);
        resolve(defaultValue);
      }
    });
  });
}

function setCfg(key, value) {
  return new Promise((resolve, reject) => {
    const dbPath = "data/";
    const dbName = "config.json";
    fs.readFile(dbPath + dbName, (err, fileData) => {
      if (err) {
        console.log("ERROR READING");
        reject(err);
      }

      try {
        const config = JSON.parse(fileData);
        config[key] = value;
        fs.writeFileSync(dbPath + dbName, JSON.stringify(config));
        console.log(
          `Key '${key}' updated with value '${value}' in config file.`
        );
        resolve(1);
      } catch (error) {
        console.error("Error parsing config file:", error);
        reject(-1);
      }
    });
  });
}

function updateDB(uuid, playerName) {
  return new Promise((resolve, reject) => {
    // const dbPath = "data/";
    const dbPath = "data/";
    const dbName = "database.json";

    fs.readFile(dbPath + dbName, (err, fileData) => {
      if (err) {
        console.log("ERROR READING");
        reject(err);
      }

      try {
        const database = JSON.parse(fileData);
        const uuidToFind = uuid;
        const entry = database.find((item) => item.uuid === uuidToFind);
        if (entry) {
          entry.points = points;
          entry.mistakes = mistakes;
          entry.name = playerName;
          const updatedData = JSON.stringify(database, null, 2);
          fs.writeFile(dbPath + dbName, updatedData, "utf8", (err) => {
            if (err) {
              console.error("Error writing to database:", err);
              reject(err);
            }

            console.log("Database updated successfully.");
            resolve(true);
          });
        } else {
          console.log("Entry with UUID not found.");
          reject(-1);
        }
      } catch (error) {
        console.error("Error parsing database:", error);
        reject(-1);
      }
    });
  });
}

function readDB() {
  return new Promise((resolve, reject) => {
    const dbPath = "data/";
    const dbName = "database.json";
    fs.readFile(dbPath + dbName, (err, fileData) => {
      if (err) {
        console.log("ERROR READING");
        reject;
      }

      try {
        const database = JSON.parse(fileData);
        resolve(database);
      } catch (error) {
        console.error("Error parsing database:", error);
        reject;
      }
    });
  });
}
