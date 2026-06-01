// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import { installConsoleCapture } from "./browser-console";

// Custom iframe command
Cypress.Commands.add("iframe", (iframeSelector: string) => {
    return cy
        .get(iframeSelector)
        .its("0.contentDocument")
        .should("exist")
        .its("body")
        .should("not.be.undefined")
        .then(($body) => {
            return cy.wrap($body);
        });
});

Cypress.Commands.add(
    "captureIframeConsole",
    { prevSubject: "element" },
    (subject) => {
        const iframe = subject[0] as HTMLIFrameElement;
        const win = iframe.contentWindow;
        if (win) {
            installConsoleCapture(win, "iframe");
        }
        return cy.wrap(subject);
    },
);

declare global {
    namespace Cypress {
        interface Chainable {
            captureIframeConsole(): Chainable<JQuery<HTMLElement>>;
        }
    }
}

// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//       iframe(iframeSelector: string): Chainable<Element>
//     }
//   }
// }

// Prevent TypeScript from reading file as legacy script
export {};
