---
name: Modular Payment Provider Architecture
use_when: When designing or implementing the payment processing system for the platform, or when integrating new payment methods.
---

The preferred architectural approach for payment processing is a **modular system using a 'PaymentProvider abstraction'**. This allows for the integration of various payment methods (e.g., Stripe, PayPal, Bitcoin, Lightning, USDC, Square, and future providers) by implementing a common interface. Creators should be able to enable the payment providers they desire in their profile.
