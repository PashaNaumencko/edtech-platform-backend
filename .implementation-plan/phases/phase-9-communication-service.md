# Phase 9: Communication Service (Chat + Video)
**Sprint 18-19 | Duration: 2 weeks**

## Phase Objectives
Implement a comprehensive communication service with real-time messaging and video call capabilities using DynamoDB, Redis, and Agora.io integration. This unified service enables seamless communication between students and tutors with support for multimedia content, video calls, screen sharing, session recording, and push notifications.

## Phase Dependencies
- **Prerequisites**: Phase 1-7 completed (all microservices, GraphQL API, event-driven architecture)
- **Requires**: User authentication, lesson scheduling, real-time subscriptions infrastructure
- **Outputs**: Real-time chat system, video call capabilities, push notifications, multimedia messaging, typing indicators, session recording

## Detailed Subphases

### 8.1 Communication Infrastructure Setup
**Duration: 2 days | Priority: Critical**

#### DynamoDB Chat Tables Design
```typescript
// Chat Sessions Table
interface ChatSession {
  sessionId: string; // PK
  participants: string[]; // User IDs
  lessonId?: string; // Optional lesson association
  courseId?: string; // Optional course association
  sessionType: 'LESSON' | 'COURSE_SUPPORT' | 'GENERAL';
  status: 'ACTIVE' | 'ARCHIVED' | 'BLOCKED';
  createdAt: string;
  lastActivity: string;
  lastMessagePreview: string;
  unreadCounts: { [userId: string]: number };
  metadata: {
    tutorId?: string;
    studentId?: string;
    subject?: string;
  };
}

// Messages Table
interface Message {
  sessionId: string; // PK
  messageId: string; // SK
  senderId: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'CODE' | 'MATH_FORMULA';
  content: {
    text?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    codeLanguage?: string;
    mathFormula?: string;
  };
  timestamp: string;
  editedAt?: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  replyToMessageId?: string;
  reactions: { [emoji: string]: string[] }; // emoji -> user IDs
  isEdited: boolean;
  isDeleted: boolean;
}
```

#### DynamoDB Table Configuration
```typescript
// Chat Sessions Table
const chatSessionsTable = new Table(this, 'ChatSessions', {
  tableName: 'chat-sessions',
  partitionKey: { name: 'sessionId', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  stream: StreamViewType.NEW_AND_OLD_IMAGES,
  pointInTimeRecovery: true,
});

// GSI for user participation lookup
chatSessionsTable.addGlobalSecondaryIndex({
  indexName: 'UserParticipationIndex',
  partitionKey: { name: 'userId', type: AttributeType.STRING },
  sortKey: { name: 'lastActivity', type: AttributeType.STRING },
});

// Messages Table
const messagesTable = new Table(this, 'ChatMessages', {
  tableName: 'chat-messages',
  partitionKey: { name: 'sessionId', type: AttributeType.STRING },
  sortKey: { name: 'messageId', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  stream: StreamViewType.NEW_AND_OLD_IMAGES,
  timeToLiveAttribute: 'ttl', // Auto-delete old messages after retention period
});

// GSI for sender message lookup
messagesTable.addGlobalSecondaryIndex({
  indexName: 'SenderMessagesIndex',
  partitionKey: { name: 'senderId', type: AttributeType.STRING },
  sortKey: { name: 'timestamp', type: AttributeType.STRING },
});
```

#### Redis Configuration for Real-time State
```typescript
// Redis configuration for real-time features
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
};

// Real-time presence tracking
interface UserPresence {
  userId: string;
  sessionId: string;
  status: 'online' | 'typing' | 'in_call' | 'offline';
  lastSeen: string;
  deviceInfo?: {
    type: 'web' | 'mobile';
    userAgent?: string;
  };
}
```

#### Agora.io Video Call Infrastructure
```typescript
// Agora.io configuration
const agoraConfig = {
  appId: process.env.AGORA_APP_ID,
  appCertificate: process.env.AGORA_APP_CERTIFICATE,
  tokenExpirationTime: 3600, // 1 hour
  channelExpirationTime: 86400, // 24 hours
};

// Video call sessions table
interface VideoCallSession {
  callId: string; // PK
  sessionId: string; // Chat session reference
  agoraChannelName: string;
  participantTokens: { [userId: string]: string };
  callStatus: 'INITIATED' | 'ACTIVE' | 'ENDED' | 'FAILED';
  startTime?: string;
  endTime?: string;
  duration?: number;
  recordingUrl?: string;
  callQuality: {
    avgBandwidth: number;
    packetsLost: number;
    avgLatency: number;
  };
  participants: {
    userId: string;
    joinTime?: string;
    leaveTime?: string;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
  }[];
}
```

### 8.2 Real-time Messaging Implementation
**Duration: 3 days | Priority: Critical**

#### GraphQL Schema for Chat
```graphql
type ChatSession {
  sessionId: ID!
  participants: [User!]!
  lessonId: ID
  courseId: ID
  sessionType: ChatSessionType!
  status: ChatSessionStatus!
  lastActivity: AWSDateTime!
  lastMessagePreview: String
  unreadCount(userId: ID!): Int!
  messages(limit: Int = 50, nextToken: String): MessageConnection!
}

type Message {
  messageId: ID!
  sessionId: ID!
  sender: User!
  messageType: MessageType!
  content: MessageContent!
  timestamp: AWSDateTime!
  editedAt: AWSDateTime
  status: MessageStatus!
  replyTo: Message
  reactions: [MessageReaction!]!
  isEdited: Boolean!
}

type MessageContent {
  text: String
  fileUrl: String
  fileName: String
  fileSize: Int
  mimeType: String
  codeLanguage: String
  mathFormula: String
}

input SendMessageInput {
  sessionId: ID!
  messageType: MessageType!
  content: MessageContentInput!
  replyToMessageId: ID
}

type Mutation {
  sendMessage(input: SendMessageInput!): Message!
  editMessage(messageId: ID!, content: MessageContentInput!): Message!
  deleteMessage(messageId: ID!): Message!
  markMessageAsRead(sessionId: ID!, messageId: ID!): Boolean!
  addReaction(messageId: ID!, emoji: String!): Message!
  removeReaction(messageId: ID!, emoji: String!): Message!
  createChatSession(input: CreateChatSessionInput!): ChatSession!
  archiveChatSession(sessionId: ID!): ChatSession!
}

type Subscription {
  onMessageSent(sessionId: ID!): Message
    @aws_subscribe(mutations: ["sendMessage"])
  
  onMessageUpdated(sessionId: ID!): Message
    @aws_subscribe(mutations: ["editMessage", "deleteMessage"])
  
  onTypingIndicator(sessionId: ID!): TypingIndicator
    @aws_subscribe(mutations: ["sendTypingIndicator"])
  
  onUserPresence(sessionId: ID!): UserPresence
    @aws_subscribe(mutations: ["updatePresence"])
}
```

#### DynamoDB Direct Resolvers for Real-time Performance
```typescript
// Direct DynamoDB resolver for sending messages
const sendMessageResolver = graphqlApi.createResolver('SendMessageResolver', {
  typeName: 'Mutation',
  fieldName: 'sendMessage',
  dataSource: messagesDataSource,
  requestMappingTemplate: MappingTemplate.fromString(`
    #set($messageId = $util.autoId())
    #set($timestamp = $util.time.nowISO8601())
    
    {
      "version": "2018-05-29",
      "operation": "PutItem",
      "key": {
        "sessionId": $util.dynamodb.toDynamoDBJson($ctx.args.input.sessionId),
        "messageId": $util.dynamodb.toDynamoDBJson($messageId)
      },
      "attributeValues": {
        "senderId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
        "messageType": $util.dynamodb.toDynamoDBJson($ctx.args.input.messageType),
        "content": $util.dynamodb.toDynamoDBJson($ctx.args.input.content),
        "timestamp": $util.dynamodb.toDynamoDBJson($timestamp),
        "status": $util.dynamodb.toDynamoDBJson("SENT"),
        "isEdited": $util.dynamodb.toDynamoDBJson(false),
        "isDeleted": $util.dynamodb.toDynamoDBJson(false),
        "reactions": $util.dynamodb.toDynamoDBJson({})
      }
    }
  `),
  responseMappingTemplate: MappingTemplate.fromString(`
    #if($ctx.error)
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    
    $util.toJson($ctx.result)
  `),
});
```

### 8.3 Chat Service Domain Implementation
**Duration: 3 days | Priority: Critical**

#### Domain Layer Architecture
```typescript
// Chat Session Aggregate
export class ChatSession extends AggregateRoot<ChatSessionId> {
  private constructor(
    id: ChatSessionId,
    private _participants: UserId[],
    private _sessionType: ChatSessionType,
    private _status: ChatSessionStatus,
    private _lessonId?: LessonId,
    private _courseId?: CourseId,
    private _lastActivity: Date = new Date(),
    private _unreadCounts: Map<string, number> = new Map()
  ) {
    super(id);
  }

  public static create(props: CreateChatSessionProps): ChatSession {
    const sessionId = ChatSessionId.generate();
    
    const session = new ChatSession(
      sessionId,
      props.participants,
      props.sessionType,
      ChatSessionStatus.ACTIVE,
      props.lessonId,
      props.courseId
    );

    session.addDomainEvent(new ChatSessionCreatedEvent({
      sessionId: sessionId.value,
      participants: props.participants.map(p => p.value),
      sessionType: props.sessionType,
      lessonId: props.lessonId?.value,
      courseId: props.courseId?.value,
    }));

    return session;
  }

  public sendMessage(senderId: UserId, content: MessageContent): Message {
    if (!this.isParticipant(senderId)) {
      throw new DomainError('User is not a participant in this chat session');
    }

    if (this._status !== ChatSessionStatus.ACTIVE) {
      throw new DomainError('Cannot send message to inactive chat session');
    }

    const message = Message.create({
      sessionId: this.id,
      senderId,
      content,
      messageType: content.getMessageType(),
    });

    this._lastActivity = new Date();
    this.incrementUnreadCounts(senderId);

    this.addDomainEvent(new MessageSentEvent({
      sessionId: this.id.value,
      messageId: message.id.value,
      senderId: senderId.value,
      content: message.content,
      timestamp: message.timestamp,
    }));

    return message;
  }

  private isParticipant(userId: UserId): boolean {
    return this._participants.some(p => p.equals(userId));
  }

  private incrementUnreadCounts(senderId: UserId): void {
    this._participants.forEach(participant => {
      if (!participant.equals(senderId)) {
        const currentCount = this._unreadCounts.get(participant.value) || 0;
        this._unreadCounts.set(participant.value, currentCount + 1);
      }
    });
  }
}

// Message Aggregate
export class Message extends AggregateRoot<MessageId> {
  private constructor(
    id: MessageId,
    private _sessionId: ChatSessionId,
    private _senderId: UserId,
    private _content: MessageContent,
    private _messageType: MessageType,
    private _timestamp: Date = new Date(),
    private _status: MessageStatus = MessageStatus.SENT,
    private _reactions: Map<string, UserId[]> = new Map(),
    private _replyToMessageId?: MessageId,
    private _isEdited: boolean = false,
    private _isDeleted: boolean = false
  ) {
    super(id);
  }

  public edit(newContent: MessageContent): void {
    if (this._isDeleted) {
      throw new DomainError('Cannot edit deleted message');
    }

    const timeSinceCreation = Date.now() - this._timestamp.getTime();
    const editTimeLimit = 30 * 60 * 1000; // 30 minutes

    if (timeSinceCreation > editTimeLimit) {
      throw new DomainError('Cannot edit message after 30 minutes');
    }

    this._content = newContent;
    this._isEdited = true;

    this.addDomainEvent(new MessageEditedEvent({
      messageId: this.id.value,
      sessionId: this._sessionId.value,
      newContent: newContent,
      editedAt: new Date(),
    }));
  }

  public addReaction(userId: UserId, emoji: string): void {
    if (!this._reactions.has(emoji)) {
      this._reactions.set(emoji, []);
    }

    const reactors = this._reactions.get(emoji)!;
    if (!reactors.some(r => r.equals(userId))) {
      reactors.push(userId);
    }
  }
}
```

### 8.4 Video Call Service Implementation
**Duration: 3 days | Priority: Critical**

#### Agora.io Integration Service
```typescript
export class AgoraVideoCallService {
  private readonly agoraAppId: string;
  private readonly agoraAppCertificate: string;

  constructor() {
    this.agoraAppId = process.env.AGORA_APP_ID!;
    this.agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE!;
  }

  async initiateCall(sessionId: string, initiatorId: string): Promise<VideoCallSession> {
    const callId = this.generateCallId();
    const channelName = `session_${sessionId}_${Date.now()}`;
    
    // Generate tokens for participants
    const session = await this.chatService.getSession(sessionId);
    const participantTokens: { [userId: string]: string } = {};
    
    for (const participantId of session.participants) {
      const token = this.generateAgoraToken(channelName, participantId);
      participantTokens[participantId] = token;
    }

    const videoCallSession: VideoCallSession = {
      callId,
      sessionId,
      agoraChannelName: channelName,
      participantTokens,
      callStatus: 'INITIATED',
      callQuality: {
        avgBandwidth: 0,
        packetsLost: 0,
        avgLatency: 0,
      },
      participants: session.participants.map(userId => ({
        userId,
        micEnabled: true,
        cameraEnabled: true,
        screenSharing: false,
      })),
    };

    await this.videoCallRepository.save(videoCallSession);
    
    // Notify participants
    await this.notificationService.notifyCallInitiated(sessionId, initiatorId, callId);

    return videoCallSession;
  }

  private generateAgoraToken(channelName: string, userId: string): string {
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    return AgoraAccessToken.buildToken(
      this.agoraAppId,
      this.agoraAppCertificate,
      channelName,
      userId,
      AgoraAccessToken.Role.PUBLISHER,
      expirationTime
    );
  }
}
```

#### Video Call Domain Events
```typescript
export class VideoCallInitiatedEvent extends DomainEvent {
  constructor(public readonly data: {
    callId: string;
    sessionId: string;
    initiatorId: string;
    participantIds: string[];
    channelName: string;
  }) {
    super();
  }
}

export class VideoCallJoinedEvent extends DomainEvent {
  constructor(public readonly data: {
    callId: string;
    userId: string;
    joinTime: Date;
  }) {
    super();
  }
}

export class VideoCallEndedEvent extends DomainEvent {
  constructor(public readonly data: {
    callId: string;
    duration: number;
    endedBy: string;
    recordingUrl?: string;
  }) {
    super();
  }
}
```

#### Screen Sharing & Recording
```typescript
export class ScreenSharingService {
  async startScreenShare(callId: string, userId: string): Promise<void> {
    const call = await this.videoCallRepository.findById(callId);
    
    // Update participant screen sharing status
    const participant = call.participants.find(p => p.userId === userId);
    if (participant) {
      participant.screenSharing = true;
    }

    await this.videoCallRepository.update(call);
    
    // Notify other participants
    await this.realTimeService.broadcastToCall(callId, {
      event: 'SCREEN_SHARE_STARTED',
      userId,
      timestamp: new Date(),
    });
  }

  async startCallRecording(callId: string): Promise<string> {
    const call = await this.videoCallRepository.findById(callId);
    
    // Start Agora cloud recording
    const recordingId = await this.agoraRecordingService.startRecording({
      channelName: call.agoraChannelName,
      uid: '999', // Recording bot UID
      recordingConfig: {
        maxIdleTime: 30,
        subscribeVideoUids: call.participants.map(p => p.userId),
        subscribeAudioUids: call.participants.map(p => p.userId),
      },
    });

    call.recordingId = recordingId;
    await this.videoCallRepository.update(call);

    return recordingId;
  }
}
```

### 8.5 File Upload & Multimedia Support
**Duration: 2 days | Priority: High**

#### S3 File Upload Service
```typescript
export class ChatFileUploadService {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucketName: string
  ) {}

  async generatePresignedUploadUrl(
    sessionId: string, 
    fileName: string, 
    fileSize: number,
    mimeType: string
  ): Promise<PresignedUploadResult> {
    // Validate file type and size
    this.validateFile(fileName, fileSize, mimeType);

    const fileKey = this.generateFileKey(sessionId, fileName);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: mimeType,
      ContentLength: fileSize,
      Metadata: {
        sessionId,
        originalFileName: fileName,
        uploadedBy: 'user', // Will be set by the client
      },
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    return {
      uploadUrl: presignedUrl,
      fileKey,
      publicUrl: `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`,
    };
  }

  private validateFile(fileName: string, fileSize: number, mimeType: string): void {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json',
      'text/javascript', 'text/x-python', 'text/x-java-source',
    ];

    if (fileSize > maxSize) {
      throw new ValidationError('File size exceeds 50MB limit');
    }

    if (!allowedTypes.includes(mimeType)) {
      throw new ValidationError(`File type ${mimeType} is not allowed`);
    }
  }
}
```

#### Code Syntax Highlighting Support
```typescript
export class CodeMessageProcessor {
  private readonly supportedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
    'html', 'css', 'sql', 'json', 'yaml', 'markdown'
  ];

  processCodeMessage(content: string, language: string): ProcessedCodeMessage {
    if (!this.supportedLanguages.includes(language)) {
      throw new ValidationError(`Unsupported code language: ${language}`);
    }

    return {
      code: content,
      language,
      lineCount: content.split('\n').length,
      estimatedReadTime: this.calculateReadTime(content),
      syntax: this.validateSyntax(content, language),
    };
  }

  private validateSyntax(code: string, language: string): SyntaxValidation {
    // Basic syntax validation for common languages
    try {
      switch (language) {
        case 'json':
          JSON.parse(code);
          break;
        case 'javascript':
        case 'typescript':
          // Basic JS/TS syntax check
          this.validateJavaScript(code);
          break;
        default:
          // For other languages, just check for balanced brackets
          this.validateBalancedBrackets(code);
      }
      
      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}
```

### 8.6 Push Notifications Integration
**Duration: 2 days | Priority: High**

#### DynamoDB Streams Processing
```typescript
// Lambda function to process message events
export class ChatNotificationProcessor {
  constructor(
    private readonly snsClient: SNSClient,
    private readonly pinpointClient: PinpointClient
  ) {}

  async processDynamoDBStream(event: DynamoDBStreamEvent): Promise<void> {
    for (const record of event.Records) {
      if (record.eventName === 'INSERT' && record.dynamodb?.NewImage) {
        await this.handleNewMessage(record.dynamodb.NewImage);
      }
    }
  }

  private async handleNewMessage(messageData: any): Promise<void> {
    const message = this.parseMessageFromDynamoDB(messageData);
    
    // Get session participants
    const session = await this.chatService.getSession(message.sessionId);
    
    // Send notifications to all participants except sender
    const recipients = session.participants.filter(p => p !== message.senderId);
    
    for (const recipientId of recipients) {
      await this.sendPushNotification(recipientId, message, session);
    }
  }

  private async sendPushNotification(
    userId: string, 
    message: Message, 
    session: ChatSession
  ): Promise<void> {
    const user = await this.userService.getUser(userId);
    const sender = await this.userService.getUser(message.senderId);
    
    const notificationContent = {
      title: `New message from ${sender.firstName}`,
      body: this.formatMessagePreview(message),
      data: {
        sessionId: session.sessionId,
        messageId: message.messageId,
        type: 'chat_message',
      },
    };

    // Send via SNS for mobile push notifications
    if (user.deviceTokens?.length > 0) {
      await this.sendMobilePushNotification(user.deviceTokens, notificationContent);
    }

    // Send via email if user is offline
    const isOnline = await this.presenceService.isUserOnline(userId);
    if (!isOnline) {
      await this.emailService.sendChatNotification(user.email, notificationContent);
    }
  }

  private formatMessagePreview(message: Message): string {
    switch (message.messageType) {
      case MessageType.TEXT:
        return message.content.text?.substring(0, 100) + '...';
      case MessageType.IMAGE:
        return '📷 Sent an image';
      case MessageType.FILE:
        return `📎 Sent ${message.content.fileName}`;
      case MessageType.CODE:
        return `💻 Sent ${message.content.codeLanguage} code`;
      case MessageType.MATH_FORMULA:
        return '🔢 Sent a math formula';
      default:
        return 'Sent a message';
    }
  }
}
```

### 8.6 Typing Indicators & Presence
**Duration: 1 day | Priority: Medium**

#### Real-time Typing Indicators
```typescript
export class TypingIndicatorService {
  private readonly typingStates = new Map<string, Set<string>>();
  private readonly typingTimeouts = new Map<string, NodeJS.Timeout>();

  async startTyping(sessionId: string, userId: string): Promise<void> {
    if (!this.typingStates.has(sessionId)) {
      this.typingStates.set(sessionId, new Set());
    }

    this.typingStates.get(sessionId)!.add(userId);

    // Clear existing timeout
    const timeoutKey = `${sessionId}:${userId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
    }

    // Auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      this.stopTyping(sessionId, userId);
    }, 3000);
    
    this.typingTimeouts.set(timeoutKey, timeout);

    // Broadcast typing event
    await this.broadcastTypingEvent(sessionId, userId, true);
  }

  async stopTyping(sessionId: string, userId: string): Promise<void> {
    this.typingStates.get(sessionId)?.delete(userId);
    
    const timeoutKey = `${sessionId}:${userId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
      this.typingTimeouts.delete(timeoutKey);
    }

    await this.broadcastTypingEvent(sessionId, userId, false);
  }

  private async broadcastTypingEvent(
    sessionId: string, 
    userId: string, 
    isTyping: boolean
  ): Promise<void> {
    const event = {
      sessionId,
      userId,
      isTyping,
      timestamp: new Date().toISOString(),
    };

    // Publish via GraphQL subscription
    await this.graphqlSubscriptionService.publish('onTypingIndicator', event);
  }
}
```

## Success Criteria

### Technical Acceptance Criteria
- Real-time messaging works with < 100ms latency
- File uploads and downloads function correctly
- Push notifications are delivered reliably
- Typing indicators work in real-time
- Message history loads efficiently with pagination
- DynamoDB streams process events without loss

### Functional Acceptance Criteria
- Users can send and receive text messages
- Image and file sharing works seamlessly
- Code sharing with syntax highlighting functions
- Message editing and deletion work correctly
- Unread message counts are accurate
- Chat sessions are created automatically for lessons

### Performance Acceptance Criteria
- Message delivery latency < 100ms
- File upload/download speed matches connection bandwidth
- Chat history loads in < 2 seconds
- Push notification delivery < 30 seconds
- Typing indicators respond within 200ms

## Risk Mitigation

### Technical Risks
- **Message Ordering**: Use DynamoDB sort keys with timestamps
- **File Storage Costs**: Implement file retention policies
- **Real-time Performance**: Optimize DynamoDB queries and use caching
- **Push Notification Delivery**: Implement fallback email notifications

### Scalability Risks
- **Concurrent Users**: Test WebSocket connection limits
- **Message Volume**: Monitor DynamoDB capacity and implement auto-scaling
- **File Storage**: Implement CDN for file distribution
- **Notification Volume**: Monitor SNS usage and costs

## Key Performance Indicators

### Performance Metrics
- Message delivery latency: < 100ms
- File upload success rate: > 99%
- Push notification delivery rate: > 95%
- Chat session load time: < 2 seconds

### User Experience Metrics
- Message read rate: > 80%
- File sharing usage rate
- User engagement time in chat
- Customer satisfaction with chat experience

## Phase Timeline

| Subphase | Duration | Dependencies | Critical Path |
|----------|----------|--------------|---------------|
| 8.1 Infrastructure Setup | 2 days | Phase 1-7 | Yes |
| 8.2 Real-time Messaging | 3 days | 8.1 | Yes |
| 8.3 Domain Implementation | 3 days | 8.2 | Yes |
| 8.4 Multimedia Support | 2 days | 8.3 | No |
| 8.5 Push Notifications | 2 days | 8.3 | Yes |
| 8.6 Typing & Presence | 1 day | 8.5 | No |

**Total Duration**: 13 days (2.6 weeks)  
**Buffer**: +3 days for optimization and testing

---

**Previous Phase**: [Phase 8: Event-Driven Architecture](phase-8-event-driven.md)  
**Next Phase**: [Phase 10: Content Service & Media Management](phase-10-content-service.md) 