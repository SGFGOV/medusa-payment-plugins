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

## 🆘 Support

If you need help with any of the payment plugins or have questions about contributing, please open an issue in the repository.

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
