# GraphQL Federation API - EdTech Platform

This directory contains the GraphQL Federation setup for the EdTech Platform, implementing Apollo Federation v2 with multiple microservice subgraphs composed into a unified supergraph.

## 🏗️ Architecture Overview

### GraphQL Federation Pattern
- **Supergraph**: Unified GraphQL API composed from all microservice subgraphs
- **Subgraphs**: Each microservice exposes its own GraphQL schema with federation directives
- **Gateway**: Apollo Gateway routes queries to appropriate subgraphs
- **Composition**: Automated schema composition and validation pipeline

### Microservices & Ports
| Service | Port | GraphQL Endpoint | Status |
|---------|------|------------------|--------|
| User Service | 3001 | http://localhost:3001/graphql | 🟡 Pending |
| Learning Service | 3002 | http://localhost:3002/graphql | 🟡 Pending |
| Content Service | 3003 | http://localhost:3003/graphql | 🟡 Pending |
| Payment Service | 3004 | http://localhost:3004/graphql | 🟡 Pending |
| Tutor Matching | 3005 | http://localhost:3005/graphql | 🟡 Pending |
| Communication | 3006 | http://localhost:3006/graphql | 🟡 Pending |
| Reviews Service | 3007 | http://localhost:3007/graphql | 🟡 Pending |
| Analytics Service | 3008 | http://localhost:3008/graphql | 🟡 Pending |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- Docker (for local development)

### Installation
```bash
# Install dependencies
cd graphql-api
npm install

# Install Apollo Rover CLI (optional)
npm install -g @apollo/rover
```

### Development Workflow

#### 1. Compose Schemas
```bash
# Validate and compose all subgraph schemas
npm run compose-schemas

# Validate schemas without composition
npm run validate-schemas
```

#### 2. Start Gateway
```bash
# Start Apollo Gateway in development mode
npm run dev:gateway

# Or start with composition
npm run dev
```

#### 3. Access GraphQL Playground
- Gateway: http://localhost:4000/graphql
- Health Check: http://localhost:4000/health

## 📁 Directory Structure

```
graphql-api/
├── gateway/                    # Apollo Gateway setup
│   └── index.js               # Gateway configuration and server
├── schemas/                   # Composed schemas
│   └── schema.graphql         # Generated supergraph schema
├── resolvers/                 # Lambda resolvers (for AppSync)
├── types/                     # Shared GraphQL types
├── scripts/                   # Automation scripts
│   ├── compose-schemas.js     # Schema composition script
│   └── validate-schemas.js    # Schema validation script
├── rover.yaml                 # Apollo Rover configuration
├── package.json              # Federation workspace dependencies
└── README.md                 # This file
```

## 🛠️ Available Scripts

### Schema Management
```bash
# Compose all subgraph schemas into supergraph
npm run compose-schemas

# Validate all schemas and check for errors
npm run validate-schemas

# Start development with automatic composition
npm run dev
```

### Gateway Operations
```bash
# Start Apollo Gateway
npm run start:gateway

# Start Gateway with hot reloading
npm run dev:gateway

# Build TypeScript (if applicable)
npm run build
```

### Using Apollo Rover
```bash
# Check schema composition with Rover
rover supergraph compose --config rover.yaml

# Validate a specific subgraph
rover subgraph check --schema path/to/schema.graphql

# Publish schema to Apollo Studio
rover subgraph publish <GRAPH_ID> --schema path/to/schema.graphql --routing-url http://localhost:3001/graphql
```

## 📋 Schema Composition Process

### 1. Subgraph Schema Creation
Each microservice defines its GraphQL schema with federation directives:

```graphql
# Example: user.subgraph.graphql
extend type Query {
  user(id: ID!): User
  me: User @auth(requires: USER)
}

type User @key(fields: "id") {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  isTutor: Boolean!
}
```

### 2. Automatic Composition
The composition script automatically:
- Discovers all subgraph schemas
- Validates federation directives
- Composes the supergraph schema
- Reports any composition errors

### 3. Gateway Configuration
Apollo Gateway uses the composed supergraph to:
- Route queries to appropriate subgraphs
- Handle federation relationships
- Manage service-to-service authentication

## 🔒 Authentication & Security

### Service-to-Service Authentication
```javascript
// Gateway adds service authentication headers
willSendRequest({ request, context }) {
  request.http.headers.set('Authorization', `Bearer ${process.env.SERVICE_TOKEN}`);
  
  if (context.user) {
    request.http.headers.set('X-User-ID', context.user.id);
    request.http.headers.set('X-User-Roles', JSON.stringify(context.user.roles));
  }
}
```

### Environment Variables
```bash
# Required for service authentication
SERVICE_TOKEN=your-service-token

# Optional gateway configuration
GATEWAY_PORT=4000
NODE_ENV=development
```

## 🧪 Testing & Validation

### Schema Validation
```bash
# Run comprehensive schema validation
npm run validate-schemas

# Expected output:
# ✅ user-service: Schema loaded and basic validation passed
# ✅ learning-service: Schema loaded and basic validation passed
# 🔧 Validating composition with X service(s)...
# ✅ Composition validation passed!
```

### Federation Testing
```bash
# Test gateway health
curl http://localhost:4000/health

# Test GraphQL introspection
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

## 🔧 Development Guidelines

### Adding New Subgraphs
1. Create subgraph schema in microservice
2. Add service configuration to `scripts/compose-schemas.js`
3. Update `rover.yaml` configuration
4. Run `npm run compose-schemas` to validate

### Federation Best Practices
- Use `@key` directive for entity types
- Implement entity resolvers for federated types
- Use `@requires` and `@provides` for field dependencies
- Test composition after schema changes

### Error Handling
- Check composition errors in script output
- Validate federation directives are present
- Ensure entity keys are resolvable
- Test cross-service relationships

## 📚 Resources

- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [GraphQL Federation Specification](https://specs.apollo.dev/federation/)
- [Apollo Rover CLI](https://www.apollographql.com/docs/rover/)
- [Apollo Gateway](https://www.apollographql.com/docs/apollo-server/federation/gateway/)

## 🐛 Troubleshooting

### Common Issues

**Schema Composition Fails**
```bash
# Check for syntax errors in subgraph schemas
npm run validate-schemas

# Verify federation directives are correct
rover subgraph check --schema path/to/schema.graphql
```

**Gateway Connection Issues**
```bash
# Ensure microservices are running
curl http://localhost:3001/health

# Check service authentication
SERVICE_TOKEN=test npm run dev:gateway
```

**Federation Directive Errors**
- Ensure `@key` fields are resolvable
- Check entity resolver implementations
- Validate `@requires` field dependencies

---

## Day 1 Status: ✅ Complete

### Deliverables Completed:
- [x] Apollo Federation dependencies installed
- [x] Federation workspace structure created
- [x] Schema composition pipeline implemented
- [x] Development scripts and documentation created

### Next Steps (Day 2):
- AWS AppSync Infrastructure setup
- Cognito authentication configuration
- Basic AppSync API deployment 