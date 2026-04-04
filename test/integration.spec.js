/**
 * Integration test: spawns `node index.js` as a real child process,
 * exactly like the GitHub Action does, but with HTTP_PROXY pointing to a
 * local stub that returns 418 for all Wikipedia requests.
 *
 * Goal: verify that an HTTP error causes the process to exit with a
 * non-zero exit code (i.e. the CI pipeline fails when scraping breaks).
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyServer } from "./proxy-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/**
 * Spawns `node index.js` with the given env overrides.
 * @returns {Promise<{ exitCode: number, stdout: string, stderr: string }>}
 */
function runIndex(extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn("node", ["index.js"], {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("close", (code) => resolve({ exitCode: code, stdout, stderr }));
  });
}

describe("index.js integration", () => {
  let proxy;

  beforeAll(async () => {
    proxy = createProxyServer();
    await proxy.start();
  }, 10_000);

  afterAll(async () => {
    await proxy.stop();
  });

  test(
    "exits with non-zero code when Wikipedia returns 418",
    async () => {
      const { exitCode, stderr } = await runIndex({
        HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
        // Disable HTTPS_PROXY fallback – keep test deterministic
        HTTPS_PROXY: `http://127.0.0.1:${proxy.port}`,
        NO_PROXY: "",
      });

      // Process must fail so GitHub Actions marks the step as failed
      expect(exitCode).not.toBe(0);

      // Error should be visible in stderr (Node unhandled rejection)
      expect(stderr).toMatch(/418|Teapot|AxiosError/i);
    },
    30_000
  );
});
