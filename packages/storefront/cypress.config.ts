import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "cypress";
import type { BrowserConsoleEntry } from "./cypress/support/browser-console";

export default defineConfig({
    e2e: {
        baseUrl: "http://localhost:8000",
        viewportWidth: 1280,
        viewportHeight: 720,
        video: true,
        videoCompression: 32,
        screenshotOnRunFailure: true,
        defaultCommandTimeout: 10000,
        chromeWebSecurity: false,
        experimentalModifyObstructiveThirdPartyCode: true,
        setupNodeEvents(on, config) {
            on("task", {
                log(message) {
                    console.log(message);
                    return null;
                },
                writeBrowserConsoleLog(payload: {
                    spec: string;
                    testTitle: string;
                    logs: BrowserConsoleEntry[];
                }) {
                    const logsDir = path.join(
                        config.projectRoot,
                        "cypress",
                        "logs",
                    );
                    fs.mkdirSync(logsDir, { recursive: true });

                    const safeSpec = payload.spec
                        .replace(/[/\\]/g, "_")
                        .replace(/\.cy\.[jt]s$/, "");
                    const fileName = `${safeSpec}-${Date.now()}.json`;
                    const filePath = path.join(logsDir, fileName);

                    fs.writeFileSync(
                        filePath,
                        JSON.stringify(
                            {
                                spec: payload.spec,
                                testTitle: payload.testTitle,
                                capturedAt: new Date().toISOString(),
                                logs: payload.logs,
                            },
                            null,
                            2,
                        ),
                        "utf8",
                    );

                    return filePath;
                },
            });
        },
    }
});
