const dgram = require("dgram");

const Teams = {
  red: "red",
  blue: "blue",
  none: "none",
};

class Device {
  /**
   *
   * @param {string} ip
   */
  constructor(ip, port) {
    this.ip = ip;
    this.identifier = this.ip.replace(/\./g, "");
    this.port = port;
    this.id = null;
    this.team = Teams.none;
    this.id;
    this.defaultTeam = Teams.red;
    this.card = null;
    this.point = null;
    /**
     * @private
     */
    this.sendCommandCallback;
    /**
     * @private
     */
    this.deviceUpdateCallbacks = [];
    this.hasSetListeners = false;
    /**
     * @private
     */
    this.createDeviceCard();
    this.createPoint();
    this.setListeners();
    this.updateCard();
  }

  registerSendCommandCallback(callback) {
    this.sendCommandCallback = callback;
  }

  registerDeviceUpdateCallback(callback) {
    this.deviceUpdateCallbacks.push(callback);
  }

  /**
   * @private
   */
  setListeners() {
    const btnReset = document
      .querySelector(`#resetBtn${this.identifier}`)
      .addEventListener("click", () => {
        console.log("reset");
        this.reset();
      });
    const btnIdentify = document
      .querySelector(`#identifyBtn${this.identifier}`)
      .addEventListener("click", () => {
        this.identifyRequest();
      });
    const btnSetDefaultBlue = document
      .querySelector(`#defaultBlueBtn${this.identifier}`)
      .addEventListener("click", () => {
        this.setDefaultTeam(Teams.blue);
      });
    const btnSetDefaultRed = document
      .querySelector(`#defaultRedBtn${this.identifier}`)
      .addEventListener("click", () => {
        this.setDefaultTeam(Teams.red);
      });
  }

  /**
   *
   * @param {string} msg
   */
  processMessage(msg) {
    switch (msg) {
      case "RESET_OK":
        this.team = Teams.none;
        break;
      case "OK_TEAMRED":
        this.defaultTeam = Teams.red;
        console.log(`Default team for ${this.id} is ${this.defaultTeam}`);
        break;
      case "OK_TEAMBLUE":
        this.defaultTeam = Teams.blue;
        console.log(`Default team for ${this.id} is ${this.defaultTeam}`);
        break;
      case "BLUE":
        this.team = Teams.blue;
        break;
      case "RED":
        this.team = Teams.red;
        break;
      case "NONE":
        this.team = Teams.none;
        break;
      case "ERROR":
        break;
      default:
        //ID
        if (msg.includes(":")) this.id = msg;
        break;
    }

    this.updateCard();
    this.updatePoint();
  }

  /**
   *
   * @param {Teams} team
   */
  setDefaultTeam(team) {
    let t = team == Teams.blue ? "DT_BLUE" : "DT_RED";
    this.sendCommandCallback(this, t);
  }

  reset() {
    console.log("RESET");
    this.sendCommandCallback(this, "RESET");
  }

  identifyRequest() {
    console.log("GETID");
    this.sendCommandCallback(this, "GETID");
  }

  getStateRequest() {
    console.log("GETSTATE");
    this.sendCommandCallback(this, "GETSTATE");
  }

  updateCard() {
    this.getElementByIdShort("devLabel").innerHTML = this.id;
    this.getElementByIdShort("devIpLabel").innerHTML = this.ip;
    this.getElementByIdShort(
      "devDefaultStateLabel"
    ).innerHTML = `Default team: ${this.defaultTeam}`;
    this.getElementByIdShort(
      "devStateLabel"
    ).innerHTML = `Current team: ${this.team}`;
  }

  /**
   *
   * @param {Device} dev
   */
  createDeviceCard() {
    const c = document.createElement("div");
    c.className = "col-3";
    c.id = `card${this.ip.replace(/\./g, "")}`;
    c.innerHTML = `
      <div class="card">
        <div class="card-header" id="devLabel${this.identifier}">${this.id}</div>
        <div class="card-body">
          <table class="table">
            <tbody>
              <tr>
                <td><button type="button" class="btn btn-secondary" id="resetBtn${this.identifier}">RESET</button></td>
                <td><button type="button" class="btn btn-secondary" id="identifyBtn${this.identifier}">IDENTIFY</button></td>
              </tr>
              <tr>
                <td colspan="2">
                <p id="devIpLabel${this.identifier}">${this.ip}</p>
                <p id="devDefaultStateLabel${this.identifier}">${this.defaultTeam}</p>
                <p id="devStateLabel${this.identifier}">${this.team}</p>
                </td>
              </tr>
              <tr>
                <td><button type="button" class="btn btn-secondary" id="defaultRedBtn${this.identifier}">DEFAULT RED</button></td>
                <td><button type="button" class="btn btn-secondary" id="defaultBlueBtn${this.identifier}">DEFAULT BLUE</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
    this.card = c;
    document.getElementById("deviceContainer").appendChild(this.card);
  }

  createPoint() {
    const p = document.createElement("div");
    p.className = "col";
    p.id = `pointDiv${this.identifier}`;

    const number = document.getElementById("pointsContainer").childNodes.length;
    p.innerHTML = `<span id="point${this.identifier}" class="fire" style="color: #000;">
    ${String.fromCharCode(number + 0x40)}</span>`;
    this.point = p;
    document.getElementById("pointsContainer").appendChild(this.point);
  }

  updatePoint() {
    let color = "#000";
    switch (this.team) {
      case Teams.blue:
        color = "#0D6EFD";
        break;
      case Teams.red:
        color = "#DC3545";
        break;
    }

    this.getElementByIdShort("point").style.color = color;
  }

  getElementByIdShort(idPrefix) {
    return document.getElementById(idPrefix + this.identifier);
  }
}

module.exports = Device;
