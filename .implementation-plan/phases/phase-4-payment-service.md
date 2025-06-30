# Phase 4: Payment Service Subgraph
**Duration: 12 days | Priority: High**

## Phase Overview

This phase implements the Payment Service following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern. It handles payment processing, subscription management, and financial workflows.

### Dependencies
- **Prerequisites**: Phase 2 (Learning Service) completed
- **Integrates with**: Learning Service for course purchases
- **Provides**: Payment processing for all platform transactions

## Subphase 4.1: Payment Service Implementation (8 days)

### Domain Layer Implementation (2 days)

#### Entities (AggregateRoot)
```typescript
// domain/entities/payment.entity.ts
import { AggregateRoot } from '@nestjs/cqrs';

export class Payment extends AggregateRoot {
  constructor(
    private readonly _id: PaymentId,
    private readonly _userId: UserId,
    private readonly _amount: Money,
    private _status: PaymentStatus,
    private _stripePaymentIntentId?: string,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreatePaymentData): Payment {
    const payment = new Payment(
      PaymentId.generate(),
      new UserId(data.userId),
      new Money(data.amount, data.currency),
      PaymentStatus.PENDING,
    );

    payment.apply(new PaymentInitiatedEvent(payment));
    return payment;
  }

  confirm(stripePaymentIntentId: string): void {
    if (this._status !== PaymentStatus.PENDING) {
      throw new PaymentNotPendingException();
    }

    this._status = PaymentStatus.COMPLETED;
    this._stripePaymentIntentId = stripePaymentIntentId;
    this.apply(new PaymentCompletedEvent(this));
  }

  fail(reason: string): void {
    if (this._status !== PaymentStatus.PENDING) {
      throw new PaymentNotPendingException();
    }

    this._status = PaymentStatus.FAILED;
    this.apply(new PaymentFailedEvent(this, reason));
  }

  refund(): void {
    if (this._status !== PaymentStatus.COMPLETED) {
      throw new PaymentNotCompletedException();
    }

    this._status = PaymentStatus.REFUNDED;
    this.apply(new PaymentRefundedEvent(this));
  }

  // Getters
  get id(): PaymentId { return this._id; }
  get userId(): UserId { return this._userId; }
  get amount(): Money { return this._amount; }
  get status(): PaymentStatus { return this._status; }
  get stripePaymentIntentId(): string | undefined { return this._stripePaymentIntentId; }
  get createdAt(): Date { return this._createdAt; }
}

// domain/entities/subscription.entity.ts
export class Subscription extends AggregateRoot {
  constructor(
    private readonly _id: SubscriptionId,
    private readonly _userId: UserId,
    private readonly _planId: PlanId,
    private readonly _price: Money,
    private _status: SubscriptionStatus,
    private _currentPeriodStart: Date,
    private _currentPeriodEnd: Date,
    private _stripeSubscriptionId?: string,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateSubscriptionData): Subscription {
    const subscription = new Subscription(
      SubscriptionId.generate(),
      new UserId(data.userId),
      new PlanId(data.planId),
      new Money(data.price, data.currency),
      SubscriptionStatus.ACTIVE,
      new Date(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    );

    subscription.apply(new SubscriptionCreatedEvent(subscription));
    return subscription;
  }

  renew(): void {
    if (this._status !== SubscriptionStatus.ACTIVE) {
      throw new SubscriptionNotActiveException();
    }

    this._currentPeriodStart = this._currentPeriodEnd;
    this._currentPeriodEnd = new Date(this._currentPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    this.apply(new SubscriptionRenewedEvent(this));
  }

  cancel(): void {
    if (this._status === SubscriptionStatus.CANCELLED) {
      throw new SubscriptionAlreadyCancelledException();
    }

    this._status = SubscriptionStatus.CANCELLED;
    this.apply(new SubscriptionCancelledEvent(this));
  }
}
```

#### Value Objects
```typescript
// domain/value-objects/money.vo.ts
export class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: Currency,
  ) {
    if (amount < 0) {
      throw new InvalidAmountException();
    }
  }

  getAmount(): number { return this.amount; }
  getCurrency(): Currency { return this.currency; }
  
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException();
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new InvalidFactorException();
    }
    return new Money(this.amount * factor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException();
    }
    return this.amount > other.amount;
  }
}

// domain/value-objects/currency.vo.ts
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}
```

### Application Layer Implementation (2 days)

#### Use Cases
```typescript
// application/use-cases/process-payment/process-payment.usecase.ts
@Injectable()
export class ProcessPaymentUseCase implements IUseCase<ProcessPaymentRequest, ProcessPaymentResponse> {
  constructor(
    private paymentRepository: PaymentRepository,
    private stripeService: StripeService,
    private eventBus: EventBus,
  ) {}

  async execute(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    // 1. Create payment entity
    const payment = Payment.create({
      userId: request.userId,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
    });

    // 2. Persist payment
    const savedPayment = await this.paymentRepository.save(payment);

    // 3. Create Stripe PaymentIntent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: request.amount * 100, // Stripe expects cents
      currency: request.currency.toLowerCase(),
      metadata: {
        paymentId: savedPayment.id.getValue(),
        userId: request.userId,
      },
    });

    // 4. Update payment with Stripe ID
    savedPayment.setStripePaymentIntentId(paymentIntent.id);
    await this.paymentRepository.save(savedPayment);

    // 5. Commit events
    savedPayment.commit();

    return ProcessPaymentResponse.fromDomain(savedPayment, paymentIntent.client_secret);
  }
}

// application/use-cases/create-subscription/create-subscription.usecase.ts
@Injectable()
export class CreateSubscriptionUseCase implements IUseCase<CreateSubscriptionRequest, CreateSubscriptionResponse> {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private stripeService: StripeService,
    private userServiceClient: UserServiceClient,
  ) {}

  async execute(request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    // 1. Validate user exists
    const user = await this.userServiceClient.getUser(request.userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    // 2. Create subscription entity
    const subscription = Subscription.create({
      userId: request.userId,
      planId: request.planId,
      price: request.price,
      currency: request.currency,
    });

    // 3. Create Stripe subscription
    const stripeSubscription = await this.stripeService.createSubscription({
      customer: user.stripeCustomerId,
      price: request.stripePriceId,
      metadata: {
        subscriptionId: subscription.id.getValue(),
        userId: request.userId,
      },
    });

    // 4. Update subscription with Stripe ID
    subscription.setStripeSubscriptionId(stripeSubscription.id);

    // 5. Persist
    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // 6. Commit events
    savedSubscription.commit();

    return CreateSubscriptionResponse.fromDomain(savedSubscription);
  }
}
```

### Infrastructure Layer Implementation (3 days)

#### Stripe Integration
```typescript
// infrastructure/stripe/services/stripe-payment.service.ts
@Injectable()
export class StripePaymentService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(data: CreatePaymentIntentData): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.confirm(paymentIntentId);
  }

  async createCustomer(data: CreateCustomerData): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        userId: data.userId,
      },
    });
  }

  async createSubscription(data: CreateStripeSubscriptionData): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.create({
      customer: data.customer,
      items: [{
        price: data.price,
      }],
      metadata: data.metadata,
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    return await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
    });
  }
}
```

#### Webhook Handling
```typescript
// infrastructure/stripe/webhooks/stripe-webhook.handler.ts
@Injectable()
export class StripeWebhookHandler {
  constructor(
    private paymentRepository: PaymentRepository,
    private subscriptionRepository: SubscriptionRepository,
    private configService: ConfigService,
  ) {}

  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    let event: Stripe.Event;

    try {
      event = Stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET')
      );
    } catch (err) {
      throw new InvalidStripeSignatureException();
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'invoice.payment_succeeded':
        await this.handleSubscriptionPayment(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const paymentId = paymentIntent.metadata.paymentId;
    const payment = await this.paymentRepository.findById(paymentId);
    
    if (payment) {
      payment.confirm(paymentIntent.id);
      await this.paymentRepository.save(payment);
      payment.commit();
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const paymentId = paymentIntent.metadata.paymentId;
    const payment = await this.paymentRepository.findById(paymentId);
    
    if (payment) {
      payment.fail(paymentIntent.last_payment_error?.message || 'Payment failed');
      await this.paymentRepository.save(payment);
      payment.commit();
    }
  }
}
```

#### PostgreSQL Integration
```typescript
// infrastructure/postgres/entities/payment.orm-entity.ts
@Entity('payments')
export class PaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// infrastructure/postgres/repositories/payment.repository.impl.ts
@Injectable()
export class PaymentRepositoryImpl implements PaymentRepository {
  constructor(
    @InjectRepository(PaymentOrmEntity)
    private paymentOrmRepository: Repository<PaymentOrmEntity>,
    private paymentMapper: PaymentMapper,
  ) {}

  async save(payment: Payment): Promise<Payment> {
    const ormEntity = this.paymentMapper.toOrmEntity(payment);
    const savedEntity = await this.paymentOrmRepository.save(ormEntity);
    return this.paymentMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Payment | null> {
    const entity = await this.paymentOrmRepository.findOne({ where: { id } });
    return entity ? this.paymentMapper.toDomain(entity) : null;
  }

  async findByUser(userId: string): Promise<Payment[]> {
    const entities = await this.paymentOrmRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(entity => this.paymentMapper.toDomain(entity));
  }

  async findByStripePaymentIntentId(stripeId: string): Promise<Payment | null> {
    const entity = await this.paymentOrmRepository.findOne({
      where: { stripePaymentIntentId: stripeId },
    });
    return entity ? this.paymentMapper.toDomain(entity) : null;
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/payments.internal.controller.ts
@Controller('internal/payments')
@UseGuards(ServiceAuthGuard)
export class InternalPaymentsController {
  constructor(
    private processPaymentUseCase: ProcessPaymentUseCase,
    private getPaymentUseCase: GetPaymentUseCase,
    private refundPaymentUseCase: RefundPaymentUseCase,
  ) {}

  @Post()
  async processPayment(@Body() dto: ProcessPaymentDto): Promise<PaymentDto> {
    const request = new ProcessPaymentRequest();
    request.userId = dto.userId;
    request.amount = dto.amount;
    request.currency = dto.currency;
    request.description = dto.description;
    
    const response = await this.processPaymentUseCase.execute(request);
    return response.payment;
  }

  @Get(':id')
  async getPayment(@Param('id') id: string): Promise<PaymentDto> {
    const request = new GetPaymentRequest();
    request.id = id;
    
    const response = await this.getPaymentUseCase.execute(request);
    return response.payment;
  }

  @Get('user/:userId')
  async getUserPayments(@Param('userId') userId: string): Promise<PaymentDto[]> {
    const request = new GetUserPaymentsRequest();
    request.userId = userId;
    
    const response = await this.getUserPaymentsUseCase.execute(request);
    return response.payments;
  }

  @Post(':id/refund')
  async refundPayment(@Param('id') id: string): Promise<PaymentDto> {
    const request = new RefundPaymentRequest();
    request.id = id;
    
    const response = await this.refundPaymentUseCase.execute(request);
    return response.payment;
  }
}

// presentation/http/controllers/public/webhook.controller.ts
@Controller('webhooks')
export class WebhookController {
  constructor(
    private stripeWebhookHandler: StripeWebhookHandler,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() payload: Buffer,
  ): Promise<{ received: boolean }> {
    await this.stripeWebhookHandler.handleWebhook(signature, payload);
    return { received: true };
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/payment.subgraph.graphql
extend type Query {
  payment(id: ID!): Payment
  userPayments(userId: ID!): [Payment!]!
  subscription(id: ID!): Subscription
  userSubscription(userId: ID!): Subscription
}

extend type Mutation {
  processPayment(input: ProcessPaymentInput!): PaymentResult! @auth(requires: USER)
  createSubscription(input: CreateSubscriptionInput!): Subscription! @auth(requires: USER)
  cancelSubscription(id: ID!): Subscription! @auth(requires: USER)
  refundPayment(id: ID!): Payment! @auth(requires: ADMIN)
}

type Payment @key(fields: "id") {
  id: ID!
  userId: ID!
  amount: Float!
  currency: String!
  status: PaymentStatus!
  description: String
  stripePaymentIntentId: String
  createdAt: AWSDateTime!
  user: User @provides(fields: "userId")
}

type Subscription @key(fields: "id") {
  id: ID!
  userId: ID!
  planId: ID!
  price: Float!
  currency: String!
  status: SubscriptionStatus!
  currentPeriodStart: AWSDateTime!
  currentPeriodEnd: AWSDateTime!
  createdAt: AWSDateTime!
  user: User @provides(fields: "userId")
}

type PaymentResult {
  payment: Payment!
  clientSecret: String!
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  UNPAID
}

# Federation relationships
extend type User @key(fields: "id") {
  id: ID! @external
  payments: [Payment!]! @requires(fields: "id")
  subscription: Subscription @requires(fields: "id")
}

extend type Course @key(fields: "id") {
  id: ID! @external
  purchases: [Payment!]! @requires(fields: "id")
}

input ProcessPaymentInput {
  amount: Float!
  currency: String!
  description: String!
}

input CreateSubscriptionInput {
  planId: ID!
  stripePriceId: String!
}
```

## Subphase 4.2: Financial Features & Integration (4 days)

### Subscription Management (2 days)
- Recurring payment handling
- Subscription lifecycle management  
- Proration and upgrades/downgrades
- Subscription analytics and reporting

### GraphQL Integration (2 days)
- Lambda resolvers for payment operations
- Federation with Learning service (course purchases)
- Federation with User service (payment history)
- Financial reporting resolvers

## Success Criteria

### Technical Acceptance Criteria
- ✅ Payment processing with Stripe integration
- ✅ Webhook handling for payment events
- ✅ Subscription management functionality
- ✅ Payment subgraph schema validates
- ✅ Secure API endpoints with authentication
- ✅ Database transactions for payment integrity

### Functional Acceptance Criteria
- ✅ Users can make course payments
- ✅ Subscription creation and management
- ✅ Payment status tracking and updates
- ✅ Refund processing capabilities
- ✅ Invoice generation and management
- ✅ Payment history and reporting

### Performance Criteria  
- ✅ Payment processing < 3 seconds
- ✅ Webhook processing < 1 second
- ✅ Payment queries < 200ms
- ✅ 99.9% payment success rate

## Dependencies & Integration
- **Learning Service**: Course purchase processing
- **User Service**: Customer and payment history
- **Notification Service**: Payment confirmations
- **Analytics Service**: Financial reporting

This service handles all financial transactions and subscription management for the platform! 