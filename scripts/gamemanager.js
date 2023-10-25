const Teams = {
  red: "red",
  blue: "blue",
  none: "none",
};

class GameManager {
  constructor() {
    this.isRunning = false;
  }

  updateCountdown() {
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
}

module.exports = GameManager;
