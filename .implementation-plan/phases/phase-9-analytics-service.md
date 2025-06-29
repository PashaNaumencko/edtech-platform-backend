# Phase 9: Analytics Service Subgraph
**Duration: 8 days | Priority: Medium**

## Phase Overview

This phase implements the Analytics Service for tracking, reporting, and insights following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern.

### Dependencies
- **Prerequisites**: Phase 8 (Notification Service) completed
- **Integrates with**: All services for event tracking
- **Provides**: Analytics, reporting, and business intelligence

## Subphase 9.1: Analytics Service Implementation (6 days)

### Domain Layer Implementation (1 day)

#### Entities (AggregateRoot)
```typescript
// domain/entities/analytics-event.entity.ts
export class AnalyticsEvent extends AggregateRoot {
  constructor(
    private readonly _id: EventId,
    private readonly _userId: UserId,
    private readonly _eventType: EventType,
    private readonly _properties: Record<string, any>,
    private readonly _timestamp: Date,
    private readonly _sessionId?: string,
    private readonly _source?: string,
  ) {
    super();
  }

  static create(data: CreateAnalyticsEventData): AnalyticsEvent {
    const event = new AnalyticsEvent(
      EventId.generate(),
      new UserId(data.userId),
      new EventType(data.eventType),
      data.properties,
      data.timestamp || new Date(),
      data.sessionId,
      data.source,
    );

    event.apply(new AnalyticsEventCreatedEvent(event));
    return event;
  }

  // Getters
  get id(): EventId { return this._id; }
  get userId(): UserId { return this._userId; }
  get eventType(): EventType { return this._eventType; }
  get properties(): Record<string, any> { return { ...this._properties }; }
  get timestamp(): Date { return this._timestamp; }
  get sessionId(): string | undefined { return this._sessionId; }
  get source(): string | undefined { return this._source; }
}

// domain/entities/dashboard-metric.entity.ts
export class DashboardMetric extends AggregateRoot {
  constructor(
    private readonly _id: MetricId,
    private readonly _name: string,
    private readonly _type: MetricType,
    private _value: number,
    private readonly _dimensions: Record<string, string>,
    private readonly _timestamp: Date,
  ) {
    super();
  }

  static create(data: CreateDashboardMetricData): DashboardMetric {
    const metric = new DashboardMetric(
      MetricId.generate(),
      data.name,
      data.type,
      data.value,
      data.dimensions,
      data.timestamp || new Date(),
    );

    metric.apply(new DashboardMetricCreatedEvent(metric));
    return metric;
  }

  updateValue(newValue: number): void {
    this._value = newValue;
    this.apply(new DashboardMetricUpdatedEvent(this));
  }

  // Getters
  get id(): MetricId { return this._id; }
  get name(): string { return this._name; }
  get type(): MetricType { return this._type; }
  get value(): number { return this._value; }
  get dimensions(): Record<string, string> { return { ...this._dimensions }; }
  get timestamp(): Date { return this._timestamp; }
}
```

### Application Layer Implementation (2 days)

#### Use Cases
```typescript
// application/use-cases/track-event/track-event.usecase.ts
@Injectable()
export class TrackEventUseCase implements IUseCase<TrackEventRequest, TrackEventResponse> {
  constructor(
    private analyticsEventRepository: AnalyticsEventRepository,
    private eventProcessor: EventProcessorService,
  ) {}

  async execute(request: TrackEventRequest): Promise<TrackEventResponse> {
    // 1. Create analytics event
    const event = AnalyticsEvent.create({
      userId: request.userId,
      eventType: request.eventType,
      properties: request.properties,
      timestamp: request.timestamp,
      sessionId: request.sessionId,
      source: request.source,
    });

    // 2. Persist
    const savedEvent = await this.analyticsEventRepository.save(event);

    // 3. Process for real-time metrics
    await this.eventProcessor.processEvent(savedEvent);

    savedEvent.commit();
    return TrackEventResponse.fromDomain(savedEvent);
  }
}

// application/use-cases/get-dashboard-metrics/get-dashboard-metrics.usecase.ts
@Injectable()
export class GetDashboardMetricsUseCase implements IUseCase<GetDashboardMetricsRequest, GetDashboardMetricsResponse> {
  constructor(
    private metricsRepository: DashboardMetricRepository,
    private metricsCalculator: MetricsCalculatorService,
  ) {}

  async execute(request: GetDashboardMetricsRequest): Promise<GetDashboardMetricsResponse> {
    // 1. Get existing metrics
    const metrics = await this.metricsRepository.findByDashboard(
      request.dashboardType,
      request.timeRange,
      request.filters,
    );

    // 2. Calculate additional metrics if needed
    const calculatedMetrics = await this.metricsCalculator.calculateMetrics(
      request.dashboardType,
      request.timeRange,
      request.filters,
    );

    // 3. Combine and return
    const allMetrics = [...metrics, ...calculatedMetrics];
    
    return GetDashboardMetricsResponse.fromDomainList(allMetrics);
  }
}
```

#### Domain Services
```typescript
// application/services/metrics-calculator.service.ts
@Injectable()
export class MetricsCalculatorService {
  constructor(
    private analyticsEventRepository: AnalyticsEventRepository,
  ) {}

  async calculateMetrics(
    dashboardType: DashboardType,
    timeRange: TimeRange,
    filters: Record<string, any>,
  ): Promise<DashboardMetric[]> {
    const metrics: DashboardMetric[] = [];

    switch (dashboardType) {
      case DashboardType.BUSINESS:
        metrics.push(...await this.calculateBusinessMetrics(timeRange, filters));
        break;
      case DashboardType.USER_ENGAGEMENT:
        metrics.push(...await this.calculateEngagementMetrics(timeRange, filters));
        break;
      case DashboardType.LEARNING:
        metrics.push(...await this.calculateLearningMetrics(timeRange, filters));
        break;
    }

    return metrics;
  }

  private async calculateBusinessMetrics(timeRange: TimeRange, filters: Record<string, any>): Promise<DashboardMetric[]> {
    const metrics: DashboardMetric[] = [];

    // Total Revenue
    const revenue = await this.analyticsEventRepository.sumProperty(
      'payment_completed',
      'amount',
      timeRange,
      filters,
    );
    metrics.push(DashboardMetric.create({
      name: 'total_revenue',
      type: MetricType.CURRENCY,
      value: revenue,
      dimensions: { period: timeRange.toString() },
    }));

    // New Users
    const newUsers = await this.analyticsEventRepository.countUniqueUsers(
      'user_registered',
      timeRange,
      filters,
    );
    metrics.push(DashboardMetric.create({
      name: 'new_users',
      type: MetricType.COUNT,
      value: newUsers,
      dimensions: { period: timeRange.toString() },
    }));

    return metrics;
  }

  private async calculateEngagementMetrics(timeRange: TimeRange, filters: Record<string, any>): Promise<DashboardMetric[]> {
    const metrics: DashboardMetric[] = [];

    // Session Duration
    const avgSessionDuration = await this.analyticsEventRepository.averageProperty(
      'session_completed',
      'duration',
      timeRange,
      filters,
    );
    metrics.push(DashboardMetric.create({
      name: 'avg_session_duration',
      type: MetricType.DURATION,
      value: avgSessionDuration,
      dimensions: { period: timeRange.toString() },
    }));

    return metrics;
  }
}
```

### Infrastructure Layer Implementation (2 days)

#### DynamoDB Integration (Time Series Data)
```typescript
// infrastructure/dynamodb/repositories/analytics-event.repository.impl.ts
@Injectable()
export class DynamoDBAnalyticsEventRepository implements AnalyticsEventRepository {
  constructor(
    @Inject('DYNAMODB_CLIENT') private dynamoClient: DynamoDBClient,
    private configService: ConfigService,
  ) {}

  async save(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    const tableName = this.configService.get('ANALYTICS_EVENTS_TABLE');
    
    const command = new PutItemCommand({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${event.userId.getValue()}` },
        SK: { S: `EVENT#${event.timestamp.toISOString()}#${event.id.getValue()}` },
        GSI1PK: { S: `EVENT_TYPE#${event.eventType.getValue()}` },
        GSI1SK: { S: event.timestamp.toISOString() },
        eventId: { S: event.id.getValue() },
        userId: { S: event.userId.getValue() },
        eventType: { S: event.eventType.getValue() },
        properties: { S: JSON.stringify(event.properties) },
        timestamp: { S: event.timestamp.toISOString() },
        sessionId: event.sessionId ? { S: event.sessionId } : undefined,
        source: event.source ? { S: event.source } : undefined,
      },
    });

    await this.dynamoClient.send(command);
    return event;
  }

  async findByUser(userId: string, timeRange: TimeRange): Promise<AnalyticsEvent[]> {
    const tableName = this.configService.get('ANALYTICS_EVENTS_TABLE');
    
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': { S: `USER#${userId}` },
        ':start': { S: `EVENT#${timeRange.start.toISOString()}` },
        ':end': { S: `EVENT#${timeRange.end.toISOString()}` },
      },
    });

    const result = await this.dynamoClient.send(command);
    return result.Items?.map(item => this.mapToAnalyticsEvent(item)) || [];
  }

  async countUniqueUsers(eventType: string, timeRange: TimeRange, filters: Record<string, any>): Promise<number> {
    // Implementation using DynamoDB aggregation
    const tableName = this.configService.get('ANALYTICS_EVENTS_TABLE');
    
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :eventType AND GSI1SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':eventType': { S: `EVENT_TYPE#${eventType}` },
        ':start': { S: timeRange.start.toISOString() },
        ':end': { S: timeRange.end.toISOString() },
      },
    });

    const result = await this.dynamoClient.send(command);
    const uniqueUsers = new Set(result.Items?.map(item => item.userId.S) || []);
    return uniqueUsers.size;
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/analytics.internal.controller.ts
@Controller('internal/analytics')
@UseGuards(ServiceAuthGuard)
export class InternalAnalyticsController {
  constructor(
    private trackEventUseCase: TrackEventUseCase,
    private getDashboardMetricsUseCase: GetDashboardMetricsUseCase,
  ) {}

  @Post('events')
  async trackEvent(@Body() dto: TrackEventDto): Promise<AnalyticsEventDto> {
    const request = new TrackEventRequest();
    request.userId = dto.userId;
    request.eventType = dto.eventType;
    request.properties = dto.properties;
    request.timestamp = dto.timestamp ? new Date(dto.timestamp) : new Date();
    request.sessionId = dto.sessionId;
    request.source = dto.source;
    
    const response = await this.trackEventUseCase.execute(request);
    return response.event;
  }

  @Get('dashboards/:type/metrics')
  async getDashboardMetrics(
    @Param('type') type: string,
    @Query() query: GetMetricsDto,
  ): Promise<DashboardMetricDto[]> {
    const request = new GetDashboardMetricsRequest();
    request.dashboardType = type as DashboardType;
    request.timeRange = new TimeRange(
      new Date(query.startDate),
      new Date(query.endDate),
    );
    request.filters = query.filters || {};
    
    const response = await this.getDashboardMetricsUseCase.execute(request);
    return response.metrics;
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/analytics.subgraph.graphql
extend type Query {
  dashboardMetrics(
    type: DashboardType!, 
    timeRange: TimeRangeInput!,
    filters: JSON
  ): [DashboardMetric!]! @auth(requires: ADMIN)
  
  userAnalytics(
    userId: ID!, 
    timeRange: TimeRangeInput!
  ): UserAnalytics! @auth(requires: USER)
}

extend type Mutation {
  trackEvent(input: TrackEventInput!): AnalyticsEvent! @auth(requires: USER)
}

type AnalyticsEvent @key(fields: "id") {
  id: ID!
  userId: ID!
  eventType: String!
  properties: JSON!
  timestamp: AWSDateTime!
  sessionId: String
  source: String
}

type DashboardMetric {
  name: String!
  type: MetricType!
  value: Float!
  dimensions: JSON!
  timestamp: AWSDateTime!
}

type UserAnalytics {
  totalSessions: Int!
  totalLearningTime: Int!
  coursesCompleted: Int!
  averageRating: Float!
  engagementScore: Float!
}

enum DashboardType {
  BUSINESS
  USER_ENGAGEMENT
  LEARNING
  FINANCIAL
}

enum MetricType {
  COUNT
  CURRENCY
  DURATION
  PERCENTAGE
  RATE
}

input TrackEventInput {
  eventType: String!
  properties: JSON!
  sessionId: String
  source: String
}

input TimeRangeInput {
  startDate: AWSDateTime!
  endDate: AWSDateTime!
}
```

## Subphase 9.2: Advanced Analytics & Integration (2 days)

### Real-time Dashboards (1 day)
- Business metrics dashboard
- User engagement analytics
- Learning progress tracking
- Financial reporting

### Data Processing (1 day)
- Event aggregation and processing
- Batch processing for historical data
- Data export and integration
- Custom report generation

## Success Criteria

### Technical Acceptance Criteria
- ✅ Event tracking system operational
- ✅ Real-time metrics calculation
- ✅ Dashboard APIs functional
- ✅ DynamoDB time-series storage
- ✅ Analytics subgraph schema validates

### Functional Acceptance Criteria
- ✅ Business metrics tracking
- ✅ User behavior analytics
- ✅ Learning progress insights
- ✅ Financial reporting
- ✅ Custom dashboard creation

### Performance Criteria
- ✅ Event ingestion < 50ms
- ✅ Real-time metrics < 200ms
- ✅ Dashboard loading < 2 seconds
- ✅ Support for 10k+ events/hour

## Dependencies & Integration
- **All Services**: Event emission and tracking
- **User Service**: User behavior analytics
- **Learning Service**: Course and session analytics
- **Payment Service**: Financial metrics

This service provides comprehensive analytics and business intelligence for the platform! 