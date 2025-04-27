# payment-services

This monorepo contains services and utilities related to payment processing with medusajs. It is designed to streamline the development, deployment, and maintenance of payment-related functionalities.

## Features

- **Modular Design**: Each payment is self-contained and can be developed, tested, and deployed independently.
- **Scalability**: Built to handle high transaction volumes with ease.
- **Extensibility**: Easily add new payment methods or integrations.
- **Security**: Implements best practices for secure payment processing.

## Structure

The repository is organized as follows:

```
/packages
    /medusa-plugin-btcpay
    /medusa-plugin-razorpay-v2
    /storefront
    /test-server
```

## Getting Started For Development

1. Clone the repository:
     ```bash
     git clone https://github.com/SGFGOV/medusa-payment-plugins.git
     ```
2. Install dependencies:
     ```bash
     yarn
     ```
4. Configure the plugins as mentioned here[https://docs.medusajs.com/learn/fundamentals/plugins/create#3-publish-plugin-locally-for-development-and-testing]
3. Start the development server:
     ```bash
     cd /test-server
     ```

## Contributing

We welcome contributions! Please follow the [contribution guidelines](CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](LICENSE).
