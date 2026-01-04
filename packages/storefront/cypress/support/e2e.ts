// Import commands.js using ES2015 syntax:
import "./commands";
import "cypress-iframe";

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
const app = window.top;
if (app) {
    app.document.addEventListener("DOMContentLoaded", () => {
        const style = app.document.createElement("style");
        style.innerHTML =
            ".command-name-request, .command-name-xhr { display: none }";
        app.document.head.appendChild(style);
    });
}

// Prevent TypeScript from reading file as legacy script
// This file is intentionally empty for Cypress setup
