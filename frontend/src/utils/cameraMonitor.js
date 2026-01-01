/**
 * 📹 Camera Monitor - Real-time camera status tracking
 * Helps identify issues during active streaming
 */

export class CameraMonitor {
  constructor() {
    this.stats = {
      framesProcessed: 0,
      frameErrors: 0,
      averageFPS: 0,
      lastFrame: null,
      streamActive: false,
      videoWidth: 0,
      videoHeight: 0,
      startTime: null,
    };
    this.frameTimestamps = [];
  }

  /**
   * Start monitoring a video element
   */
  startMonitoring(videoElement, interval = 1000) {
    if (!videoElement) {
      console.error("❌ No video element provided");
      return;
    }

    this.stats.streamActive = true;
    this.stats.startTime = Date.now();

    this.monitoringInterval = setInterval(() => {
      this._updateStats(videoElement);
      this._logStats();
    }, interval);

    console.log("🎥 Camera monitoring started");
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.stats.streamActive = false;
    console.log("🛑 Camera monitoring stopped");
  }

  /**
   * Record successful frame processing
   */
  recordFrame() {
    this.stats.framesProcessed++;
    this.frameTimestamps.push(Date.now());

    // Keep only last 30 frames for FPS calculation
    if (this.frameTimestamps.length > 30) {
      this.frameTimestamps.shift();
    }

    // Calculate FPS
    if (this.frameTimestamps.length > 1) {
      const timespan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
      this.stats.averageFPS = Math.round((this.frameTimestamps.length / timespan) * 1000);
    }

    this.stats.lastFrame = new Date().toISOString();
  }

  /**
   * Record frame error
   */
  recordError(error) {
    this.stats.frameErrors++;
    console.error("📹 Frame error:", error);
  }

  /**
   * Update statistics from video element
   */
  _updateStats(videoElement) {
    this.stats.videoWidth = videoElement.videoWidth || 0;
    this.stats.videoHeight = videoElement.videoHeight || 0;
  }

  /**
   * Log current statistics
   */
  _logStats() {
    const uptime = Math.round((Date.now() - this.stats.startTime) / 1000);

    console.log(
      `📊 Camera Status [${uptime}s] | Frames: ${this.stats.framesProcessed} | FPS: ${this.stats.averageFPS} | Errors: ${this.stats.frameErrors} | Resolution: ${this.stats.videoWidth}x${this.stats.videoHeight}`
    );
  }

  /**
   * Get full statistics object
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get readable report
   */
  getReport() {
    const uptime = Math.round((Date.now() - this.stats.startTime) / 1000);
    const errorRate = this.stats.framesProcessed > 0
      ? ((this.stats.frameErrors / this.stats.framesProcessed) * 100).toFixed(2)
      : 0;

    return {
      "⏱️ Uptime (seconds)": uptime,
      "🎬 Frames Processed": this.stats.framesProcessed,
      "📊 Average FPS": this.stats.averageFPS,
      "❌ Errors": this.stats.frameErrors,
      "📈 Error Rate (%)": errorRate,
      "📹 Video Resolution": `${this.stats.videoWidth}x${this.stats.videoHeight}`,
      "🟢 Stream Active": this.stats.streamActive ? "YES" : "NO",
      "⏰ Last Frame": this.stats.lastFrame,
    };
  }
}

// Global instance for console access
if (typeof window !== "undefined") {
  window.cameraMonitor = new CameraMonitor();
}

export default CameraMonitor;
