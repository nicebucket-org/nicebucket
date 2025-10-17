import { spawn, spawnSync } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// keep track of the `tauri-driver` child process
let tauriDriver;
let exit = false;

export const config = {
  runner: "local",
  tsConfigPath: "./tsconfig.json",
  specs: ["./e2e/**/*.e2e.ts"],
  exclude: [],
  logLevel: "info",
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [],

  host: "127.0.0.1",
  port: 1420,
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: "./src-tauri/target/debug/tauri-demo",
      },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  // ensure the rust project is built since we expect this binary to exist for the webdriver sessions
  onPrepare: () => {
    console.log("Building Tauri application for e2e tests...");
    const result = spawnSync("npm", ["run", "build:e2e"], {
      cwd: __dirname,
      stdio: "inherit",
      shell: true,
    });

    if (result.status !== 0) {
      console.error("Failed to build Tauri application");
      process.exit(1);
    }
    console.log("Tauri application built successfully");
  },

  // ensure we are running `tauri-driver` before the session starts so that we can proxy the webdriver requests
  beforeSession: () => {
    console.log("Starting tauri-driver...");

    // Try to find tauri-driver in PATH first, then fallback to cargo bin
    const tauriDriverPath =
      spawnSync("which", ["tauri-driver"], {
        encoding: "utf8",
      }).stdout.trim() ||
      path.resolve(os.homedir(), ".cargo", "bin", "tauri-driver");

    tauriDriver = spawn(tauriDriverPath, ["--port", "1420"], {
      stdio: [null, process.stdout, process.stderr],
    });

    tauriDriver.on("error", (error) => {
      console.error("tauri-driver error:", error);
      process.exit(1);
    });

    tauriDriver.on("exit", (code) => {
      if (!exit) {
        console.error("tauri-driver exited with code:", code);
        process.exit(1);
      }
    });

    // Give tauri-driver some time to start up
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("tauri-driver should be ready");
        resolve();
      }, 2000);
    });
  },

  // clean up the `tauri-driver` process we spawned at the start of the session
  // note that afterSession might not run if the session fails to start, so we also run the cleanup on shutdown
  afterSession: () => {
    closeTauriDriver();
  },
};

function closeTauriDriver() {
  exit = true;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  tauriDriver?.kill();
}

function onShutdown(fn) {
  const cleanup = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      fn();
    } finally {
      process.exit();
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
  process.on("SIGBREAK", cleanup);
}

// ensure tauri-driver is closed when our test process exits
onShutdown(() => {
  closeTauriDriver();
});
