describe('Cookie Management', () => {
  it('should clear cookies between tests', () => {
    // Visit the store page
    cy.visit('/in/store')

    // Set a test cookie
    cy.setCookie('testCookie', 'testValue')

    // Verify the cookie exists
    cy.getCookie('testCookie').should('exist')
    cy.getCookie('testCookie').should('have.property', 'value', 'testValue')

    // Reload the page to trigger beforeEach hook
    cy.reload()

    // Verify the cookie is cleared
    cy.getCookie('testCookie').should('not.exist')
  })
}) 