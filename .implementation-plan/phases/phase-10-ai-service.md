# Phase 10: AI Service Subgraph
**Duration: 10 days | Priority: Medium**

## Phase Overview

This phase implements the AI Service for intelligent tutoring, content recommendations, and automated assistance following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern.

### Dependencies
- **Prerequisites**: Phase 9 (Analytics Service) completed
- **Integrates with**: Learning Service, User Service, Content Service
- **Provides**: AI-powered features and recommendations

## Subphase 10.1: AI Service Implementation (7 days)

### Domain Layer Implementation (1 day)

#### Entities (AggregateRoot)
```typescript
// domain/entities/ai-recommendation.entity.ts
export class AIRecommendation extends AggregateRoot {
  constructor(
    private readonly _id: RecommendationId,
    private readonly _userId: UserId,
    private readonly _type: RecommendationType,
    private readonly _content: RecommendationContent,
    private readonly _confidence: number,
    private readonly _context: Record<string, any>,
    private _feedback?: UserFeedback,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateAIRecommendationData): AIRecommendation {
    const recommendation = new AIRecommendation(
      RecommendationId.generate(),
      new UserId(data.userId),
      data.type,
      new RecommendationContent(data.content),
      data.confidence,
      data.context,
    );

    recommendation.apply(new AIRecommendationCreatedEvent(recommendation));
    return recommendation;
  }

  provideFeedback(feedback: UserFeedback): void {
    this._feedback = feedback;
    this.apply(new RecommendationFeedbackProvidedEvent(this, feedback));
  }

  // Getters
  get id(): RecommendationId { return this._id; }
  get userId(): UserId { return this._userId; }
  get type(): RecommendationType { return this._type; }
  get content(): RecommendationContent { return this._content; }
  get confidence(): number { return this._confidence; }
  get context(): Record<string, any> { return { ...this._context }; }
  get feedback(): UserFeedback | undefined { return this._feedback; }
  get createdAt(): Date { return this._createdAt; }
}

// domain/entities/ai-session.entity.ts
export class AISession extends AggregateRoot {
  constructor(
    private readonly _id: AISessionId,
    private readonly _userId: UserId,
    private readonly _type: AISessionType,
    private _messages: AIMessage[],
    private _status: AISessionStatus,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateAISessionData): AISession {
    const session = new AISession(
      AISessionId.generate(),
      new UserId(data.userId),
      data.type,
      [],
      AISessionStatus.ACTIVE,
    );

    session.apply(new AISessionCreatedEvent(session));
    return session;
  }

  addMessage(message: AIMessage): void {
    this._messages.push(message);
    this.apply(new AIMessageAddedEvent(this, message));
  }

  complete(): void {
    this._status = AISessionStatus.COMPLETED;
    this.apply(new AISessionCompletedEvent(this));
  }

  // Getters
  get id(): AISessionId { return this._id; }
  get userId(): UserId { return this._userId; }
  get type(): AISessionType { return this._type; }
  get messages(): AIMessage[] { return [...this._messages]; }
  get status(): AISessionStatus { return this._status; }
  get createdAt(): Date { return this._createdAt; }
}
```

### Application Layer Implementation (2 days)

#### Use Cases
```typescript
// application/use-cases/generate-recommendations/generate-recommendations.usecase.ts
@Injectable()
export class GenerateRecommendationsUseCase implements IUseCase<GenerateRecommendationsRequest, GenerateRecommendationsResponse> {
  constructor(
    private recommendationRepository: AIRecommendationRepository,
    private userServiceClient: UserServiceClient,
    private learningServiceClient: LearningServiceClient,
    private aiEngine: AIRecommendationEngine,
  ) {}

  async execute(request: GenerateRecommendationsRequest): Promise<GenerateRecommendationsResponse> {
    // 1. Get user context
    const user = await this.userServiceClient.getUser(request.userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    // 2. Get user's learning history
    const learningHistory = await this.learningServiceClient.getUserLearningHistory(request.userId);

    // 3. Generate recommendations using AI
    const recommendations = await this.aiEngine.generateRecommendations({
      userId: request.userId,
      userProfile: user,
      learningHistory,
      recommendationType: request.type,
      limit: request.limit || 10,
    });

    // 4. Create and persist recommendation entities
    const savedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const recommendation = AIRecommendation.create({
          userId: request.userId,
          type: rec.type,
          content: rec.content,
          confidence: rec.confidence,
          context: rec.context,
        });

        const saved = await this.recommendationRepository.save(recommendation);
        saved.commit();
        return saved;
      })
    );

    return GenerateRecommendationsResponse.fromDomainList(savedRecommendations);
  }
}

// application/use-cases/chat-with-ai/chat-with-ai.usecase.ts
@Injectable()
export class ChatWithAIUseCase implements IUseCase<ChatWithAIRequest, ChatWithAIResponse> {
  constructor(
    private aiSessionRepository: AISessionRepository,
    private aiChatEngine: AIChatEngine,
  ) {}

  async execute(request: ChatWithAIRequest): Promise<ChatWithAIResponse> {
    // 1. Get or create AI session
    let session = await this.aiSessionRepository.findById(request.sessionId);
    if (!session) {
      session = AISession.create({
        userId: request.userId,
        type: AISessionType.TUTORING,
      });
      session = await this.aiSessionRepository.save(session);
    }

    // 2. Add user message
    const userMessage = new AIMessage({
      role: MessageRole.USER,
      content: request.message,
      timestamp: new Date(),
    });
    session.addMessage(userMessage);

    // 3. Generate AI response
    const aiResponse = await this.aiChatEngine.generateResponse({
      sessionId: session.id.getValue(),
      messages: session.messages,
      context: {
        userId: request.userId,
        subject: request.subject,
      },
    });

    // 4. Add AI response to session
    const aiMessage = new AIMessage({
      role: MessageRole.ASSISTANT,
      content: aiResponse.content,
      timestamp: new Date(),
      metadata: aiResponse.metadata,
    });
    session.addMessage(aiMessage);

    // 5. Persist session
    const savedSession = await this.aiSessionRepository.save(session);
    savedSession.commit();

    return ChatWithAIResponse.fromDomain(savedSession, aiMessage);
  }
}
```

#### Domain Services
```typescript
// application/services/ai-recommendation-engine.service.ts
@Injectable()
export class AIRecommendationEngine {
  constructor(
    private openAIService: OpenAIService,
    private analyticsServiceClient: AnalyticsServiceClient,
  ) {}

  async generateRecommendations(data: GenerateRecommendationsData): Promise<RecommendationData[]> {
    // 1. Prepare context for AI
    const context = await this.prepareRecommendationContext(data);

    // 2. Generate recommendations using OpenAI
    const prompt = this.buildRecommendationPrompt(data.recommendationType, context);
    const aiResponse = await this.openAIService.generateCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert educational recommendation system.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // 3. Parse and validate AI response
    const recommendations = this.parseRecommendations(aiResponse.content);

    // 4. Calculate confidence scores
    return recommendations.map(rec => ({
      ...rec,
      confidence: this.calculateConfidence(rec, context),
    }));
  }

  private async prepareRecommendationContext(data: GenerateRecommendationsData): Promise<RecommendationContext> {
    // Get user analytics
    const userAnalytics = await this.analyticsServiceClient.getUserAnalytics(
      data.userId,
      { days: 30 },
    );

    return {
      userProfile: data.userProfile,
      learningHistory: data.learningHistory,
      analytics: userAnalytics,
      preferences: data.userProfile.preferences,
    };
  }

  private buildRecommendationPrompt(type: RecommendationType, context: RecommendationContext): string {
    switch (type) {
      case RecommendationType.COURSE:
        return `Based on the user's learning history and preferences, recommend 5 courses that would be most beneficial. 
                User has completed: ${context.learningHistory.completedCourses.join(', ')}
                User's interests: ${context.preferences.subjects.join(', ')}
                User's skill level: ${context.preferences.skillLevel}`;
      
      case RecommendationType.TUTOR:
        return `Recommend 5 tutors based on the user's learning needs and preferences.
                User needs help with: ${context.preferences.subjects.join(', ')}
                User's budget: $${context.preferences.budget}
                User's schedule: ${context.preferences.schedule}`;
      
      case RecommendationType.STUDY_PLAN:
        return `Create a personalized study plan for the user based on their goals and current progress.
                User's goals: ${context.preferences.goals.join(', ')}
                Available time: ${context.preferences.availableTime} hours/week
                Current progress: ${JSON.stringify(context.learningHistory.progress)}`;
      
      default:
        return 'Provide general learning recommendations for this user.';
    }
  }

  private parseRecommendations(aiResponse: string): RecommendationData[] {
    try {
      // Parse AI response (assuming JSON format)
      const parsed = JSON.parse(aiResponse);
      return parsed.recommendations || [];
    } catch (error) {
      // Fallback parsing if JSON parsing fails
      return this.fallbackParseRecommendations(aiResponse);
    }
  }

  private calculateConfidence(recommendation: RecommendationData, context: RecommendationContext): number {
    // Simple confidence calculation based on various factors
    let confidence = 0.5; // Base confidence

    // Increase confidence based on context match
    if (context.preferences.subjects.includes(recommendation.subject)) {
      confidence += 0.2;
    }

    // Increase confidence based on user's past behavior
    if (context.learningHistory.completedCourses.some(course => 
        course.subject === recommendation.subject)) {
      confidence += 0.1;
    }

    // Increase confidence based on user's skill level match
    if (recommendation.skillLevel === context.preferences.skillLevel) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }
}
```

### Infrastructure Layer Implementation (3 days)

#### OpenAI Integration
```typescript
// infrastructure/openai/services/openai.service.ts
@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async generateCompletion(data: GenerateCompletionData): Promise<CompletionResponse> {
    const response = await this.openai.chat.completions.create({
      model: data.model,
      messages: data.messages,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model,
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }

  async moderateContent(content: string): Promise<ModerationResult> {
    const response = await this.openai.moderations.create({
      input: content,
    });

    return {
      flagged: response.results[0].flagged,
      categories: response.results[0].categories,
      scores: response.results[0].category_scores,
    };
  }
}
```

#### Vector Database Integration (for recommendations)
```typescript
// infrastructure/vector/services/vector-search.service.ts
@Injectable()
export class VectorSearchService {
  constructor(
    private configService: ConfigService,
  ) {}

  async searchSimilarContent(
    embedding: number[],
    limit: number = 10,
    filters?: Record<string, any>,
  ): Promise<SimilarContent[]> {
    // Integration with vector database (Pinecone, Weaviate, etc.)
    // This would typically involve:
    // 1. Query vector database with embedding
    // 2. Apply filters
    // 3. Return similar content with scores
    
    return [];
  }

  async indexContent(content: ContentToIndex): Promise<void> {
    // Index content in vector database
    // 1. Generate embedding for content
    // 2. Store in vector database with metadata
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/ai.internal.controller.ts
@Controller('internal/ai')
@UseGuards(ServiceAuthGuard)
export class InternalAIController {
  constructor(
    private generateRecommendationsUseCase: GenerateRecommendationsUseCase,
    private chatWithAIUseCase: ChatWithAIUseCase,
  ) {}

  @Post('recommendations')
  async generateRecommendations(@Body() dto: GenerateRecommendationsDto): Promise<AIRecommendationDto[]> {
    const request = new GenerateRecommendationsRequest();
    request.userId = dto.userId;
    request.type = dto.type;
    request.limit = dto.limit;
    
    const response = await this.generateRecommendationsUseCase.execute(request);
    return response.recommendations;
  }

  @Post('chat')
  async chatWithAI(@Body() dto: ChatWithAIDto): Promise<AIChatResponseDto> {
    const request = new ChatWithAIRequest();
    request.userId = dto.userId;
    request.sessionId = dto.sessionId;
    request.message = dto.message;
    request.subject = dto.subject;
    
    const response = await this.chatWithAIUseCase.execute(request);
    return {
      sessionId: response.sessionId,
      message: response.message,
    };
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/ai.subgraph.graphql
extend type Query {
  aiRecommendations(
    type: RecommendationType!, 
    limit: Int = 10
  ): [AIRecommendation!]! @auth(requires: USER)
  
  aiSession(id: ID!): AISession @auth(requires: USER)
  
  studyPlan(userId: ID!): StudyPlan @auth(requires: USER)
}

extend type Mutation {
  generateRecommendations(input: GenerateRecommendationsInput!): [AIRecommendation!]! @auth(requires: USER)
  
  chatWithAI(input: ChatWithAIInput!): AIChatResponse! @auth(requires: USER)
  
  provideFeedback(
    recommendationId: ID!, 
    feedback: RecommendationFeedback!
  ): AIRecommendation! @auth(requires: USER)
}

type AIRecommendation @key(fields: "id") {
  id: ID!
  userId: ID!
  type: RecommendationType!
  content: RecommendationContent!
  confidence: Float!
  context: JSON!
  feedback: RecommendationFeedback
  createdAt: AWSDateTime!
  user: User @provides(fields: "userId")
}

type AISession @key(fields: "id") {
  id: ID!
  userId: ID!
  type: AISessionType!
  messages: [AIMessage!]!
  status: AISessionStatus!
  createdAt: AWSDateTime!
}

type AIMessage {
  role: MessageRole!
  content: String!
  timestamp: AWSDateTime!
  metadata: JSON
}

type AIChatResponse {
  sessionId: ID!
  message: AIMessage!
}

type StudyPlan {
  id: ID!
  userId: ID!
  goals: [String!]!
  timeline: StudyTimeline!
  recommendations: [AIRecommendation!]!
  progress: StudyProgress!
}

enum RecommendationType {
  COURSE
  TUTOR
  STUDY_PLAN
  CONTENT
  PRACTICE
}

enum AISessionType {
  TUTORING
  CAREER_GUIDANCE
  STUDY_PLANNING
  GENERAL_HELP
}

enum AISessionStatus {
  ACTIVE
  COMPLETED
  PAUSED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

input GenerateRecommendationsInput {
  type: RecommendationType!
  limit: Int = 10
}

input ChatWithAIInput {
  sessionId: ID
  message: String!
  subject: String
}
```

## Subphase 10.2: Advanced AI Features & Integration (3 days)

### Machine Learning Models (2 days)
- Personalized recommendation algorithms
- Content similarity matching
- Learning path optimization
- Student performance prediction

### GraphQL Integration (1 day)
- Lambda resolvers for AI operations
- Real-time AI chat functionality
- Recommendation caching and optimization
- AI-powered search enhancement

## Success Criteria

### Technical Acceptance Criteria
- ✅ AI recommendation engine operational
- ✅ OpenAI integration functional
- ✅ Vector database for similarity search
- ✅ AI chat system working
- ✅ AI subgraph schema validates

### Functional Acceptance Criteria
- ✅ Personalized course recommendations
- ✅ AI-powered tutoring assistance
- ✅ Intelligent study plan generation
- ✅ Content recommendation system
- ✅ Chatbot for student support

### Performance Criteria
- ✅ Recommendation generation < 2 seconds
- ✅ AI chat response < 3 seconds
- ✅ Recommendation accuracy > 70%
- ✅ Chat response relevance > 80%

## Dependencies & Integration
- **Learning Service**: Course and progress data
- **User Service**: User preferences and behavior
- **Analytics Service**: User behavior analytics
- **Content Service**: Content indexing and retrieval

This service provides intelligent AI-powered features throughout the platform! 