import { Paystack } from './paystack';
import { PaymentProcessor } from './processor.interface';

export class PaymentFactory {
  processorRegistry(): Record<string, PaymentProcessor> {
    return {
      paystack: new Paystack(),
    };
  }
  getProcessor(name: string): PaymentProcessor {
    if (!this.processorRegistry()[name]) {
      throw new Error('unregistered processor');
    }
    return this.processorRegistry()[name];
  }
}
