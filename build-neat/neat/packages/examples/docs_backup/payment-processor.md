# Neat Framework - Payment Processor Example

This example demonstrates the factory pattern implementation for dynamic strategy selection and execution.

```typescript
import { Result, isResultError } from '../core/src/types/index.js';
import {
  PaymentMethod,
  PaymentData,
  PaymentResult,
  PaymentStrategy,
  CreditCardPaymentStrategy,
  PayPalPaymentStrategy,
  BankTransferPaymentStrategy,
  CryptoPaymentStrategy,
  CreditCardData,
  PayPalData,
  BankTransferData,
  CryptoData,
} from './payment-strategies.js';

// ... rest of the payment processor code ...
```

See the original file for complete implementation details.

