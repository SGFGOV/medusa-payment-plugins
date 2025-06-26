# Medusa.js Payment Plugins Collection | Razorpay & BTCPay Integration

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Medusa.js](https://img.shields.io/badge/Medusa.js-2.7.0-blue)](https://www.medusajs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

A comprehensive collection of payment plugins and services for [Medusa.js](https://www.medusajs.com/), the open-source headless commerce engine. This repository provides ready-to-use payment integrations for e-commerce stores, including Indian payment gateway (Razorpay) and cryptocurrency (Bitcoin) payment solutions.

## 🌟 Features

- **Multiple Payment Methods**: Support for various payment providers
- **TypeScript Support**: Fully typed for better development experience
- **Easy Integration**: Simple setup process for each payment provider
- **Production Ready**: Tested and optimized for production use
- **Active Maintenance**: Regular updates and security patches

## 🏦 Available Payment Plugins

### 1. Razorpay V2 Plugin
A payment plugin for integrating Razorpay V2 into your Medusa.js store. This plugin is specifically designed for merchants operating in India, providing seamless integration with Razorpay's payment gateway which supports various Indian payment methods including UPI, NetBanking, Wallets, and Cards.

**Key Features:**
- UPI Integration
- NetBanking Support
- Digital Wallets
- Credit/Debit Cards
- EMI Options
- Indian Rupee (INR) Support

[View Plugin Documentation](./packages/medusa-plugin-razorpay-v2/README.md)

### 2. BTCPay Plugin
A cryptocurrency payment plugin that integrates BTCPay Server with Medusa.js. This plugin enables your store to accept Bitcoin payments through a self-hosted BTCPay Server instance, providing a secure and decentralized payment solution for cryptocurrency transactions.

**Key Features:**
- Bitcoin Payment Processing
- Self-hosted Solution
- Decentralized Payments
- Enhanced Security
- Real-time Payment Status

[View Plugin Documentation](./packages/medusa-plugin-btcpay/README.md)

## 🛠️ Additional Components

- **Test Server**: A development server for testing payment integrations
  [View Documentation](./packages/test-server/README.md)
- **Storefront**: A reference storefront implementation
  [View Documentation](./packages/storefront/README.md)

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/SGFGOV/payment-services.git
cd payment-services
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development environment:
```bash
yarn dev
```

## 🤝 Contributing

We welcome contributions to expand the collection of payment plugins! If you've developed a payment plugin for Medusa.js, we'd love to include it in this repository. Here's how you can contribute:

1. Fork the repository
2. Create a new branch for your plugin
3. Add your plugin to the `packages` directory
4. Include comprehensive documentation
5. Submit a pull request

### Guidelines for New Payment Plugins

- Follow the existing plugin structure
- Include TypeScript types
- Provide clear documentation
- Include tests
- Follow Medusa.js plugin conventions

## 💻 Development

This repository uses:
- Yarn workspaces for package management
- Turborepo for build system
- TypeScript for type safety
- ESLint and Prettier for code formatting

## 🧪 Testing

This repository includes comprehensive end-to-end (e2e) tests using Cypress to ensure the payment integration flows work correctly.

### Prerequisites

Before running the e2e tests, make sure you have:

1. **Docker and Docker Compose** installed and running
2. **Node.js** (version 18 or higher)
3. **Yarn** package manager

### Setting Up the Test Environment

1. **Start the development environment:**
   ```bash
   # Install dependencies
   yarn install
   
   # Start all services (Medusa backend, database, Redis, etc.)
   yarn dev
   ```

2. **Seed the database with test data:**
   ```bash
   # Navigate to the test-server package
   cd packages/test-server
   
   # Run database migrations and seed with test data
   npx medusa db:migrate
   npx medusa exec ./src/scripts/seed.ts
   ```
   
   This will create:
   - Sample products (T-Shirt, Sweatshirt, Sweatpants, Shorts)
   - Product categories and variants
   - Shipping options and regions
   - Payment providers configuration
   - Inventory levels
   - API keys and sales channels

3. **Verify services are running:**
   - Medusa backend should be running on `http://localhost:9000`
   - Storefront should be running on `http://localhost:8000`
   - Database and Redis should be running via Docker

### Running E2E Tests

The e2e tests are located in `packages/storefront/cypress/e2e/` and test the complete checkout flow including payment processing.

#### Option 1: Run Tests in Headless Mode (CI/CD)
```bash
# Navigate to the storefront package
cd packages/storefront

# Run tests in headless mode
yarn cypress:run
```

#### Option 2: Open Cypress Test Runner (Interactive)
```bash
# Navigate to the storefront package
cd packages/storefront

# Open Cypress test runner
yarn cypress:open
```

This will open the Cypress Test Runner where you can:
- See all available test files
- Run tests individually or all at once
- Watch tests execute in real-time
- Debug and interact with the application during test execution

### Test Configuration

The Cypress configuration is located at `packages/storefront/cypress.config.ts` with the following settings:

- **Base URL**: `http://localhost:8000` (storefront)
- **Viewport**: 1280x720
- **Video Recording**: Disabled
- **Screenshots**: Enabled on failure
- **Default Timeout**: 10 seconds
- **Chrome Web Security**: Disabled (for iframe testing)

### Available Test Files

- `checkout.cy.ts` - Tests the complete checkout flow with Razorpay payment integration
  - Product selection and cart management
  - Address and shipping information
  - Payment method selection
  - Razorpay payment processing
  - Order confirmation

### Test Data and Environment

The tests use the following test data:
- **Product**: Sweatpants (first product in the store)
- **Size**: L
- **Shipping Address**: Mumbai, Maharashtra, India
- **Payment Method**: Razorpay UPI
- **Test UPI ID**: `gov@okaxis`

### Troubleshooting

#### Common Issues:

1. **Tests fail with "element not found" errors:**
   - Ensure the storefront is running on port 8000
   - Check that the Medusa backend is running on port 9000
   - Verify that test data is properly seeded

2. **No products appear in the store:**
   - Make sure you've run the database seeding script: `npx medusa exec ./src/scripts/seed.ts`
   - Check that the database migrations have been applied: `npx medusa db:migrate`
   - Verify the Medusa backend is running and connected to the database

3. **Razorpay iframe issues:**
   - The tests include specific handling for Razorpay iframes
   - Chrome Web Security is disabled to allow iframe interactions
   - Tests include appropriate wait times for iframe loading

4. **Payment processing timeouts:**
   - The tests include extended wait times for payment processing
   - If tests consistently timeout, consider increasing wait times in the test file

5. **Database connection issues:**
   - Ensure Docker containers are running: `docker-compose ps`
   - Restart services if needed: `yarn dev`
   - Check database logs: `docker-compose logs postgres`

#### Debug Mode:

To run tests with additional logging:
```bash
cd packages/storefront
ELECTRON_ENABLE_LOGGING=1 yarn cypress:run
```

### Continuous Integration

The e2e tests are designed to run in CI/CD environments. The headless mode (`cypress:run`) is optimized for automated testing pipelines.

## 🆘 Support

If you need help with any of the payment plugins or have questions about contributing, please contact us:

- Email: [sgf@sourcegoodfood.com](mailto:sgf@sourcegoodfood.com)
- Discord: [govdiw006](https://discord.com/users/govdiw006)

## 💖 Sponsorship

If you find these payment plugins helpful, please consider sponsoring the project. Your support helps maintain and improve the plugins for the community.

[Sponsor this project](https://github.com/sponsors/SGFGOV)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Medusa.js](https://www.medusajs.com/) for the amazing e-commerce framework
- All contributors who have helped build and maintain these payment plugins

## 🔍 Keywords

Medusa.js, Payment Plugins, E-commerce, Razorpay, BTCPay, Bitcoin Payments, Indian Payment Gateway, UPI Integration, Cryptocurrency Payments, Headless Commerce, TypeScript, Open Source, Payment Integration, E-commerce Solutions
