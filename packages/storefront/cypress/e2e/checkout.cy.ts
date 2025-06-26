import { c } from "vite/dist/node/types.d-aGj9QkWt"

const basicTest = (cy: any) => {
  console.log('🧹 Clearing all cookies before test')
  cy.clearAllCookies()

  // Visit the store page
  console.log('🏪 Visiting store page')
  cy.visit('/in/store')

  // Click on the first product (sweatpants)
  console.log('👕 Selecting first product')
  cy.get('[data-testid="product-card"]').first().click()

  // Verify we're on the product page
  console.log('🔍 Verifying product page')
  cy.url().should('include', '/products/sweatpants')

  // Select size L
  console.log('📏 Selecting size L')
  cy.contains('button', 'L').click()

  // Add to cart
  console.log('🛒 Adding product to cart')
  cy.contains('button', 'Add to cart').click()

  // Wait for 10 seconds
  console.log('⏳ Waiting for cart update')
  cy.wait(10000)

  // Click on cart
  console.log('🛒 Navigating to cart page')
  cy.contains('Cart').click()

  // Verify we're on the cart page
  console.log('🔍 Verifying cart page')
  cy.url().should('include', '/cart')

  // Click go to checkout
  console.log('➡️ Proceeding to checkout')
  cy.contains('button', 'Go to checkout').click({ force: true })

  // Verify we're on the address step
  console.log('🔍 Verifying address step')
  cy.url().should('include', '/checkout?step=address')

  // Wait for the address form to be visible
  console.log('⏳ Waiting for address form')
  cy.get('[data-testid="shipping-first-name-input"]').should('be.visible')

  // Fill in address details
  console.log('📝 Filling shipping address details')
  cy.get('[data-testid="shipping-first-name-input"]').type('Govind')
  cy.get('[data-testid="shipping-last-name-input"]').type('D')
  cy.get('[data-testid="shipping-address-input"]').type('123 xyz.com')
  cy.get('[data-testid="shipping-company-input"]').type('SGF')
  cy.get('[data-testid="shipping-postal-code-input"]').type('400093')
  cy.get('[data-testid="shipping-city-input"]').type('Mumbai')
  cy.get('[data-testid="shipping-province-input"]').type('Maharashtra')
  cy.get('[data-testid="shipping-country-select"]').select('India')
  cy.get('[data-testid="shipping-email-input"]').type('sgf@sourcegoodfood.com')
  cy.get('[data-testid="shipping-phone-input"]').type('+916364534849')

  // Click on Delivery
  console.log('➡️ Proceeding to delivery step')
  cy.contains('button', 'Continue to delivery').click()

  // Verify we're on the delivery step
  console.log('🔍 Verifying delivery step')
  cy.url().should('include', '/checkout?step=delivery')

  // Wait for 10 seconds
  console.log('⏳ Waiting for delivery options')
  cy.wait(10000)

  // Select Standard Shipping
  console.log('🚚 Selecting standard shipping')
  cy.get('[data-testid="delivery-option-radio"]').first().click()

  // Click Continue to payment
  console.log('➡️ Proceeding to payment step')
  cy.contains('button', 'Continue to payment').click()

  // Verify we're on the payment step
  console.log('🔍 Verifying payment step')
  cy.url().should('include', '/checkout?step=payment')

  // Wait for 10 seconds
  console.log('⏳ Waiting for payment options')
  cy.wait(20000)

  // Wait for the Razorpay payment option to be visible
  console.log('💳 Looking for Razorpay payment option')
  cy.get('[data-testid="payment-option-pp_razorpay_razorpay"]').click()
  cy.wait(5000)


  // Click continue to review
  console.log('➡️ Proceeding to review step')
  cy.get('[data-testid="submit-payment-button"]').click()

  // Verify we're on the review step
  console.log('🔍 Verifying review step')
  cy.url().should('include', '/checkout?step=review')
  cy.wait(5000)

  // Click checkout button
  console.log('✅ Finalizing checkout')
  cy.get('[data-testid="complete-checkout-button"]').click()

  // Handle Razorpay popup

  // Wait for the Razorpay iframe to be created and visible

}


describe('E-commerce Checkout Flow', () => {
  it.skip('should complete the checkout process with Razorpay payment', () => {
    // Clear all cookies before starting the test
    basicTest(cy)
  })



  it('should complete the checkout process with Razorpay payment (no mock)', () => {
    // Clear all cookies before starting the test
    basicTest(cy)

    // Handle Razorpay popup

    // Wait for Razorpay iframe to load
    console.log('⏳ Waiting for Razorpay iframe')
    cy.wait(10000) // Increased wait time for iframe to load

    // Wait for the Razorpay iframe to be created and visible
    console.log('💳 Processing Razorpay payment')
    //cy.frameLoaded('.razorpay-checkout-frame')
    cy.frameLoaded('.razorpay-checkout-frame[style*="width: 100%"]')
    // Wait for the correct iframe to be loaded and target it specifically
   // cy.iframe('.razorpay-checkout-frame[style*="width: 100%"]')
    cy.get('.razorpay-checkout-frame[style*="width: 100%"]')
      .should('be.visible')
      .then($iframe => {
        const $body = $iframe.contents().find('body');
        cy.wrap($body).within(() => {
          console.log('🔍 Inside Razorpay iframe')
          
          // Wait for the iframe content to be fully loaded
          cy.wait(3000)
          
          // Click on UPI tab
          console.log('💳 Selecting UPI payment method')
          cy.get('div[class="bg-surface-25 px-2 py-2 transition-all duration-300 ease-in-out empty:hidden focus-visible:border-solid focus-visible:border-opacity-100 peer-checked:bg-surface extra-light-theme:bg-surface-600/10 !bg-surface "]').click()

          // Wait for the UPI input field to be visible
          console.log('⏳ Waiting for UPI input field')
          cy.get('input[name="vpa"]').should('be.visible')

          // Enter UPI ID
          console.log('💳 Entering UPI ID')
          cy.get('input[name="vpa"]').type('gov@okaxis')

          // Click the submit button
          console.log('✅ Submitting UPI payment')
          cy.get('button[data-testid="vpa-submit"]').click()
        })
      })

    // Wait for 60 seconds for payment processing
    cy.wait(60000)

    // Verify we're on the order confirmation page
    console.log('🔍 Verifying order confirmation')
    cy.url().should('include', '/order/')
    cy.url().should('include', '/confirmed')

    // Verify success message
    console.log('✅ Verifying success message')
    cy.contains('Thank you!')
    cy.contains('Your order was placed successfully.')
  })
})
