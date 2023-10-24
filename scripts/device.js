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
    console.log(`new ${ip}`);
    this.ip = ip;
    this.port = port;
    this.id = null;
    this.team = Teams.none;
    this.id;
    this.defaultTeam = Teams.none;
    this.card = null;
    this.updateCard();
    /**
     * @private
     */
    this.sendCommandCallback;
    /**
     * @private
     */
    this.deviceUpdateCallbacks = [];
  }

  registerSendCommandCallback(callback) {
    this.sendCommandCallback = callback;
  }

  registerDeviceUpdateCallback(callback) {
    this.deviceUpdateCallbacks.push(callback);
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
    this.sendCommandCallback(this, "RESET");
  }

  getStateRequest() {
    this.sendCommandCallback(this, "GETSTATE");
  }

  updateCard() {
    const c = document.createElement("div");
    c.className = "col-3";
    c.id = `card${this.ip.replace(/\./g, "")}`;
    c.innerHTML = `
  <div class="card">
    <div class="card-header""> 
      ${this.id}
    </div>
    <div class="card-body">
      <table class="table">
        <tbody>
          <tr>
            <td><button type="button" class="btn btn-secondary" id="reset${this.ip.replace(
              ".",
              ""
            )}">RESET</button></td>
            <td><button type="button" class="btn btn-secondary">IDENTIFY</button></td>
          </tr>
          <tr>
            <td colspan="2">
              <p>${this.ip}</p>
            </td>
          </tr>
          <tr>
            <td><button type="button" class="btn btn-secondary">DEFAULT RED</button></td>
            <td><button type="button" class="btn btn-secondary">DEFAULT BLUE</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
    this.card = c;
    this.deviceUpdateCallbacks.forEach((cb) => {
      cb(this);
    });
  }
}

module.exports = Device;
