describe('E-commerce Checkout Flow', () => {
  it('should complete the checkout process with Razorpay payment', () => {
    // Visit the store page
    cy.visit('/in/store')
    
    // Click on the first product (sweatpants)
    cy.get('[data-testid="product-card"]').first().click()
    
    // Verify we're on the product page
    cy.url().should('include', '/products/sweatpants')
    
    // Select size L
    cy.contains('button', 'L').click()
    
    // Add to cart
    cy.contains('button', 'Add to cart').click()
    
    // Wait for 10 seconds
    cy.wait(10000)
    
    // Click on cart
    cy.contains('Cart').click()
    
    // Verify we're on the cart page
    cy.url().should('include', '/cart')
    
    // Click go to checkout
    cy.contains('button', 'Go to checkout').click({ force: true })
    
    // Verify we're on the address step
    cy.url().should('include', '/checkout?step=address')
    
    // Wait for the address form to be visible
    cy.get('[data-testid="shipping-first-name-input"]').should('be.visible')
    
    // Fill in address details
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
    cy.contains('button', 'Continue to delivery').click()
    
    // Verify we're on the delivery step
    cy.url().should('include', '/checkout?step=delivery')
    
    // Wait for 10 seconds
    cy.wait(10000)
    
    // Select Standard Shipping
    cy.get('[data-testid="delivery-option-radio"]').first().click()
    
    // Click Continue to payment
    cy.contains('button', 'Continue to payment').click()
    
    // Verify we're on the payment step
    cy.url().should('include', '/checkout?step=payment')
    
    // Wait for 10 seconds
    cy.wait(20000)
    
    // Wait for the Razorpay payment option to be visible
    cy.contains('.text-base-regular', 'Razorpay').should('be.visible')
    
    // Select Razorpay
    cy.contains('.text-base-regular', 'Razorpay').click()
    
    // Click continue to review
    cy.contains('button', 'Continue to review').click()
    
    // Verify we're on the review step
    cy.url().should('include', '/checkout?step=review')
    
    // Click checkout button
    cy.contains('button', 'Checkout').click()
    
    // Handle Razorpay popup
    cy.window().then((win) => {
      // Wait for Razorpay iframe to load
      cy.wait(20000)
      
      // Wait for the Razorpay iframe to be created and visible
      cy.get('iframe.razorpay-checkout-frame:visible').should('exist')
      
      // Switch to the Razorpay iframe
      cy.get('iframe.razorpay-checkout-frame:visible').iframe().within(() => {
        // Click on UPI tab
        cy.get('[data-value="upi"]').click()
        
        // Wait for the UPI input field to be visible
        cy.get('input[placeholder="example@okhdfcbank"]').should('be.visible')
        
        // Enter UPI ID
        cy.get('input[placeholder="example@okhdfcbank"]').type('gov@okaxis')
        
        // Click the submit button
        cy.get('button[data-testid="vpa-submit"]').click()
      })
      
      // Wait for 60 seconds for payment processing
      cy.wait(60000)
    })
    
    // Verify we're on the order confirmation page
    cy.url().should('include', '/order/')
    cy.url().should('include', '/confirmed')
    
    // Verify success message
    cy.contains('Thank you!')
    cy.contains('Your order was placed successfully.')
  })
}) 