# Phase 6: Communication Service Subgraph
**Duration: 12 days | Priority: High**

## Phase Overview

This phase implements the Communication Service for messaging, video calls, and session management following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern.

### Dependencies
- **Prerequisites**: Phase 5 (Tutor Matching) completed
- **Integrates with**: User Service, Tutor Matching Service
- **Provides**: Real-time messaging, video calls, session booking

## Subphase 6.1: Communication Service Implementation (8 days)

### Domain Layer Implementation (2 days)

#### Entities (AggregateRoot)
```typescript
// domain/entities/session.entity.ts
export class Session extends AggregateRoot {
  constructor(
    private readonly _id: SessionId,
    private readonly _tutorId: UserId,
    private readonly _studentId: UserId,
    private readonly _scheduledAt: Date,
    private _duration: number, // minutes
    private _status: SessionStatus,
    private _meetingLink?: string,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateSessionData): Session {
    const session = new Session(
      SessionId.generate(),
      new UserId(data.tutorId),
      new UserId(data.studentId),
      data.scheduledAt,
      data.duration,
      SessionStatus.SCHEDULED,
    );

    session.apply(new SessionCreatedEvent(session));
    return session;
  }

  start(meetingLink: string): void {
    if (this._status !== SessionStatus.SCHEDULED) {
      throw new SessionNotScheduledException();
    }
    this._status = SessionStatus.IN_PROGRESS;
    this._meetingLink = meetingLink;
    this.apply(new SessionStartedEvent(this));
  }

  complete(): void {
    this._status = SessionStatus.COMPLETED;
    this.apply(new SessionCompletedEvent(this));
  }

  cancel(reason: string): void {
    this._status = SessionStatus.CANCELLED;
    this.apply(new SessionCancelledEvent(this, reason));
  }
}

// domain/entities/message.entity.ts
export class Message extends AggregateRoot {
  constructor(
    private readonly _id: MessageId,
    private readonly _senderId: UserId,
    private readonly _recipientId: UserId,
    private readonly _content: string,
    private _isRead: boolean = false,
    private readonly _sentAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateMessageData): Message {
    const message = new Message(
      MessageId.generate(),
      new UserId(data.senderId),
      new UserId(data.recipientId),
      data.content,
    );

    message.apply(new MessageSentEvent(message));
    return message;
  }

  markAsRead(): void {
    if (!this._isRead) {
      this._isRead = true;
      this.apply(new MessageReadEvent(this));
    }
  }
}
```

### Application Layer Implementation (2 days)

#### Use Cases
```typescript
// application/use-cases/create-session/create-session.usecase.ts
@Injectable()
export class CreateSessionUseCase implements IUseCase<CreateSessionRequest, CreateSessionResponse> {
  constructor(
    private sessionRepository: SessionRepository,
    private userServiceClient: UserServiceClient,
    private videoCallService: VideoCallService,
  ) {}

  async execute(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    // 1. Validate participants
    const [tutor, student] = await Promise.all([
      this.userServiceClient.getUser(request.tutorId),
      this.userServiceClient.getUser(request.studentId),
    ]);

    if (!tutor?.isTutor || !student || student.isTutor) {
      throw new InvalidSessionParticipantsException();
    }

    // 2. Create session
    const session = Session.create({
      tutorId: request.tutorId,
      studentId: request.studentId,
      scheduledAt: request.scheduledAt,
      duration: request.duration,
    });

    // 3. Persist
    const savedSession = await this.sessionRepository.save(session);
    savedSession.commit();

    return CreateSessionResponse.fromDomain(savedSession);
  }
}

// application/use-cases/send-message/send-message.usecase.ts
@Injectable()
export class SendMessageUseCase implements IUseCase<SendMessageRequest, SendMessageResponse> {
  constructor(
    private messageRepository: MessageRepository,
    private websocketGateway: WebSocketGateway,
  ) {}

  async execute(request: SendMessageRequest): Promise<SendMessageResponse> {
    // 1. Create message
    const message = Message.create({
      senderId: request.senderId,
      recipientId: request.recipientId,
      content: request.content,
    });

    // 2. Persist
    const savedMessage = await this.messageRepository.save(message);

    // 3. Send real-time notification
    await this.websocketGateway.sendToUser(request.recipientId, {
      type: 'NEW_MESSAGE',
      data: MessageDto.fromDomain(savedMessage),
    });

    savedMessage.commit();
    return SendMessageResponse.fromDomain(savedMessage);
  }
}
```

### Infrastructure Layer Implementation (3 days)

#### WebSocket Gateway
```typescript
// infrastructure/websocket/communication.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'communication',
})
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>(); // userId -> socketId

  async handleConnection(client: Socket): Promise<void> {
    const userId = this.extractUserIdFromToken(client.handshake.auth.token);
    if (userId) {
      this.userSockets.set(userId, client.id);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = [...this.userSockets.entries()]
      .find(([, socketId]) => socketId === client.id)?.[0];
    if (userId) {
      this.userSockets.delete(userId);
    }
  }

  async sendToUser(userId: string, data: any): Promise<void> {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('message', data);
    }
  }
}
```

#### Video Call Integration
```typescript
// infrastructure/video/services/video-call.service.ts
@Injectable()
export class VideoCallService {
  constructor(
    private configService: ConfigService,
  ) {}

  async createMeetingRoom(sessionId: string): Promise<string> {
    // Integration with video service (Agora, Zoom, etc.)
    const roomId = `session-${sessionId}`;
    
    // Create meeting room via API
    const meetingLink = `https://meet.example.com/room/${roomId}`;
    
    return meetingLink;
  }

  async generateAccessToken(userId: string, roomId: string): Promise<string> {
    // Generate access token for video service
    return 'access-token-' + userId + '-' + roomId;
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/sessions.internal.controller.ts
@Controller('internal/sessions')
@UseGuards(ServiceAuthGuard)
export class InternalSessionsController {
  constructor(
    private createSessionUseCase: CreateSessionUseCase,
    private startSessionUseCase: StartSessionUseCase,
    private getSessionUseCase: GetSessionUseCase,
  ) {}

  @Post()
  async createSession(@Body() dto: CreateSessionDto): Promise<SessionDto> {
    const request = new CreateSessionRequest();
    request.tutorId = dto.tutorId;
    request.studentId = dto.studentId;
    request.scheduledAt = new Date(dto.scheduledAt);
    request.duration = dto.duration;
    
    const response = await this.createSessionUseCase.execute(request);
    return response.session;
  }

  @Put(':id/start')
  async startSession(@Param('id') id: string): Promise<SessionDto> {
    const request = new StartSessionRequest();
    request.sessionId = id;
    
    const response = await this.startSessionUseCase.execute(request);
    return response.session;
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/communication.subgraph.graphql
extend type Query {
  session(id: ID!): Session
  userSessions(userId: ID!, status: SessionStatus): [Session!]!
  messages(senderId: ID!, recipientId: ID!): [Message!]!
}

extend type Mutation {
  createSession(input: CreateSessionInput!): Session! @auth(requires: USER)
  startSession(id: ID!): Session! @auth(requires: USER)
  completeSession(id: ID!): Session! @auth(requires: USER)
  sendMessage(input: SendMessageInput!): Message! @auth(requires: USER)
}

extend type Subscription {
  messageReceived(userId: ID!): Message! @auth(requires: USER)
  sessionUpdated(sessionId: ID!): Session! @auth(requires: USER)
}

type Session @key(fields: "id") {
  id: ID!
  tutorId: ID!
  studentId: ID!
  scheduledAt: AWSDateTime!
  duration: Int!
  status: SessionStatus!
  meetingLink: String
  createdAt: AWSDateTime!
  tutor: User @provides(fields: "tutorId")
  student: User @provides(fields: "studentId")
}

type Message @key(fields: "id") {
  id: ID!
  senderId: ID!
  recipientId: ID!
  content: String!
  isRead: Boolean!
  sentAt: AWSDateTime!
  sender: User @provides(fields: "senderId")
  recipient: User @provides(fields: "recipientId")
}

enum SessionStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

input CreateSessionInput {
  tutorId: ID!
  studentId: ID!
  scheduledAt: AWSDateTime!
  duration: Int!
}

input SendMessageInput {
  recipientId: ID!
  content: String!
}
```

## Subphase 6.2: Real-time Features & Integration (4 days)

### WebSocket Implementation (2 days)
- Real-time messaging system
- Session status updates
- Typing indicators and presence
- Connection management and scaling

### Video Integration (2 days)
- Video call service integration
- Screen sharing capabilities
- Recording functionality
- Meeting room management

## Success Criteria

### Technical Acceptance Criteria
- ✅ Session booking and management working
- ✅ Real-time messaging operational
- ✅ Video call integration functional
- ✅ WebSocket connections stable
- ✅ Communication subgraph schema validates

### Functional Acceptance Criteria
- ✅ Users can book tutoring sessions
- ✅ Real-time chat between tutor/student
- ✅ Video calls start automatically at session time
- ✅ Session status updates in real-time
- ✅ Message history persisted and searchable

### Performance Criteria
- ✅ Message delivery < 100ms
- ✅ Video call setup < 5 seconds
- ✅ WebSocket connection stability > 99%
- ✅ Concurrent sessions support > 1000

## Dependencies & Integration
- **User Service**: Participant validation and profiles
- **Tutor Matching Service**: Session booking from matches
- **Payment Service**: Session payment processing
- **Notification Service**: Session reminders and alerts

This service enables real-time communication and tutoring sessions! 