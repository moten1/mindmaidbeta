/**
 * 📷 Camera Diagnostics Utility
 * Helps identify and troubleshoot camera connectivity issues on Render
 */

export const CameraDiagnostics = {
  /**
   * Run complete diagnostics
   */
  async runFullDiagnostics() {
    console.log("🔍 Running Camera Diagnostics...\n");

    const report = {
      timestamp: new Date().toISOString(),
      environment: {},
      browser: {},
      api: {},
      connectivity: {},
      issues: [],
    };

    // 1. Environment checks
    console.log("1️⃣ Environment Checks:");
    report.environment = {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecureContext: window.isSecureContext,
      isDevelopment: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1",
    };
    console.log(report.environment);
    if (!window.isSecureContext && !report.environment.isDevelopment) {
      report.issues.push("❌ Not on secure context (HTTPS required for camera)");
    }

    // 2. Browser API checks
    console.log("\n2️⃣ Browser API Checks:");
    report.browser = {
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      hasWebSocket: !!window.WebSocket,
      userAgent: navigator.userAgent.substring(0, 50),
    };
    console.log(report.browser);

    if (!report.browser.hasGetUserMedia) {
      report.issues.push("❌ getUserMedia not supported - check browser compatibility");
    }

    // 3. Camera device enumeration
    console.log("\n3️⃣ Available Devices:");
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter((d) => d.kind === "videoinput");
      report.api.cameraDevices = cameraDevices.length;
      console.log(`Found ${cameraDevices.length} camera device(s)`);
      cameraDevices.forEach((d, i) => console.log(`  ${i + 1}. ${d.label || "Unnamed"}`));

      if (cameraDevices.length === 0) {
        report.issues.push("❌ No camera devices found - check hardware");
      }
    } catch (err) {
      report.issues.push(`❌ Cannot enumerate devices: ${err.message}`);
      console.error(err);
    }

    // 4. Permission check
    console.log("\n4️⃣ Camera Permission Test:");
    try {
      // Try to request camera (with small 0.5s timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 500);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1 }, // minimal request
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Success - stop the stream immediately
      stream.getTracks().forEach((t) => t.stop());
      report.api.cameraAccess = "granted";
      console.log("✅ Camera access granted");
    } catch (err) {
      clearTimeout(timeout);
      report.api.cameraAccess = "denied";
      const errorMap = {
        NotAllowedError: "Permission denied by user",
        NotFoundError: "No camera device",
        NotReadableError: "Camera in use",
        SecurityError: "HTTPS required",
        NotSupportedError: "Browser not supported",
      };
      console.error(`❌ ${errorMap[err.name] || err.message}`);
      report.issues.push(`❌ Camera access failed: ${errorMap[err.name] || err.message}`);
    }

    // 5. WebSocket connectivity
    console.log("\n5️⃣ WebSocket Connectivity:");
    const wsUrl = process.env.REACT_APP_WS_URL_PROD || process.env.REACT_APP_WS_URL;
    if (!wsUrl) {
      report.issues.push("❌ WebSocket URL not configured (check .env)");
    } else {
      report.connectivity.wsUrl = wsUrl;
      console.log(`Testing WS: ${wsUrl}`);

      try {
        const ws = new WebSocket(wsUrl);
        const wsPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error("Connection timeout (5s)"));
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve("connected");
          };

          ws.onerror = (err) => {
            clearTimeout(timeout);
            reject(new Error("WebSocket error"));
          };
        });

        const result = await wsPromise;
        report.connectivity.wsStatus = "✅ reachable";
        console.log("✅ WebSocket endpoint reachable");
      } catch (err) {
        report.connectivity.wsStatus = "❌ unreachable";
        console.error(`❌ WebSocket test failed: ${err.message}`);
        report.issues.push(`❌ WebSocket unreachable: ${err.message}`);
      }
    }

    // 6. Generate summary
    console.log("\n" + "=".repeat(50));
    console.log("📋 DIAGNOSTICS SUMMARY");
    console.log("=".repeat(50));
    console.log(JSON.stringify(report, null, 2));

    if (report.issues.length === 0) {
      console.log("\n✅ No issues detected - camera should work!");
    } else {
      console.log(`\n⚠️  ${report.issues.length} issue(s) found:`);
      report.issues.forEach((issue) => console.log(issue));
    }

    return report;
  },

  /**
   * Quick test of camera access
   */
  async quickCameraTest() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      return { success: true, message: "✅ Camera access works" };
    } catch (err) {
      return {
        success: false,
        message: `❌ Camera access failed: ${err.name}`,
        error: err.name,
      };
    }
  },

  /**
   * Check if environment is suitable for camera access
   */
  isEnvironmentSuitable() {
    const checks = {
      isSecureContext: window.isSecureContext,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      hasWebSocket: !!window.WebSocket,
    };

    const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    return {
      suitable: isDev || (checks.isSecureContext && checks.hasGetUserMedia),
      checks,
      isDev,
    };
  },
};

export default CameraDiagnostics;
