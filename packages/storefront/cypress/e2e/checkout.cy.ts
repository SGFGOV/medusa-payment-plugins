// Note: console.log in Cypress runs when the line is queued, not when the step
// finishes. Later steps can fail even if you already see "success" logs above.

const basicTest = () => {
    cy.clearAllCookies();

    cy.visit("/in/store");
    cy.get('[data-testid="products-list"]', { timeout: 30000 }).should(
        "be.visible"
    );

    cy.get('[data-testid="product-card"]')
        .first()
        .closest("a")
        .invoke("attr", "href")
        .then((href) => {
            cy.visit(href as string);
        });

    cy.get('[data-testid="product-container"]', { timeout: 30000 }).should(
        "be.visible"
    );
    cy.url().should("match", /\/products\/[^/]+$/);

    cy.contains("button", "L").click();
    cy.contains("button", "Add to cart").click();

    cy.wait(10000);

    cy.contains("Cart").click();
    cy.url().should("include", "/cart");

    cy.contains("button", "Go to checkout").click({ force: true });
    cy.url().should("include", "/checkout?step=address");

    cy.get('[data-testid="shipping-first-name-input"]').should("be.visible");

    cy.get('[data-testid="shipping-first-name-input"]').type("Govind");
    cy.get('[data-testid="shipping-last-name-input"]').type("D");
    cy.get('[data-testid="shipping-address-input"]').type("123 xyz.com");
    cy.get('[data-testid="shipping-company-input"]').type("SGF");
    cy.get('[data-testid="shipping-postal-code-input"]').type("400093");
    cy.get('[data-testid="shipping-city-input"]').type("Mumbai");
    cy.get('[data-testid="shipping-province-input"]').type("Maharashtra");
    cy.get('[data-testid="shipping-country-select"]').select("India");
    cy.get('[data-testid="shipping-email-input"]').type(
        "sgf@sourcegoodfood.com"
    );
    cy.get('[data-testid="shipping-phone-input"]').type("+916364534849");

    cy.contains("button", "Continue to delivery").click();
    cy.url().should("include", "/checkout?step=delivery");

    cy.wait(10000);

    cy.get('[data-testid="delivery-option-radio"]').first().click();
    cy.contains("button", "Continue to payment").click();
    cy.url().should("include", "/checkout?step=payment");

    cy.wait(20000);

    cy.get('[data-testid="payment-option-pp_razorpay_razorpay"]').click();
    cy.wait(5000);

    cy.get('[data-testid="submit-payment-button"]').click();
    cy.url().should("include", "/checkout?step=review");
    cy.wait(5000);

    cy.get('[data-testid="complete-checkout-button"]').click();
};

describe("E-commerce Checkout Flow", () => {
    it.skip("should complete the checkout process with Razorpay payment", () => {
        basicTest();
    });

    it("should complete the checkout process with Razorpay payment (no mock)", () => {
        basicTest();

        cy.wait(10000);

        cy.frameLoaded('.razorpay-checkout-frame[style*="width: 100%"]');
        cy.get('.razorpay-checkout-frame[style*="width: 100%"]')
            .should("be.visible")
            .then(($iframe) => {
                const $body = $iframe.contents().find("body");
                cy.wrap($body).within(() => {
                    cy.wait(3000);
                    cy.contains("UPI").first().click();
                    cy.wait(5000);
                    cy.get('input[placeholder="example@okhdfcbank"]').should(
                        "be.visible"
                    );
                    cy.get('input[placeholder="example@okhdfcbank"]').type(
                        "gov@okaxis"
                    );
                    cy.get('button[data-testid="vpa-submit"]').click();
                });
            });

        cy.wait(60000);

        cy.url().should("include", "/order/");
        cy.url().should("include", "/confirmed");
        cy.contains("Thank you!");
        cy.contains("Your order was placed successfully.");
    });
});
