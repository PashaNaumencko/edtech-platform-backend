const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');

// Gateway configuration
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'user-service', url: 'http://localhost:3001/graphql' }
    ],
  }),
  
  // Development mode settings
  debug: process.env.NODE_ENV !== 'production',
  
  // Custom fetcher for service-to-service authentication
  buildService({ url }) {
    return new (require('@apollo/gateway')).RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        // Add service authentication token
        if (process.env.SERVICE_TOKEN) {
          request.http.headers.set('Authorization', `Bearer ${process.env.SERVICE_TOKEN}`);
        }
        
        // Forward user context
        if (context.user) {
          request.http.headers.set('X-User-ID', context.user.id);
          request.http.headers.set('X-User-Roles', JSON.stringify(context.user.roles));
        }
      }
    });
  }
});

async function startGateway() {
  const PORT = process.env.GATEWAY_PORT || 4000;
  
  // Create Express app
  const app = express();
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      gateway: 'apollo-federation' 
    });
  });
  
  try {
    // Create Apollo Server with gateway
    const server = new ApolloServer({
      gateway,
      subscriptions: false, // Disable subscriptions for now
      
      // Context function to handle authentication
      context: ({ req }) => {
        // Extract user from JWT token or session
        const authHeader = req.headers.authorization;
        let user = null;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            // TODO: Implement JWT token verification
            // For now, extract user info from header
            const userHeader = req.headers['x-user-id'];
            const rolesHeader = req.headers['x-user-roles'];
            
            if (userHeader) {
              user = {
                id: userHeader,
                roles: rolesHeader ? JSON.parse(rolesHeader) : []
              };
            }
          } catch (error) {
            console.warn('⚠️  Failed to parse user context:', error.message);
          }
        }
        
        return { user };
      },
      
      // Custom plugins
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                console.log(`🔍 GraphQL Operation: ${requestContext.request.operationName || 'Anonymous'}`);
              },
              didEncounterErrors(requestContext) {
                console.error('❌ GraphQL Errors:', requestContext.errors);
              }
            };
          }
        }
      ]
    });
    
    // Start server first
    await server.start();
    
    // Apply middleware
    server.applyMiddleware({ app, path: '/graphql' });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Apollo Gateway running at http://localhost:${PORT}${server.graphqlPath}`);
      console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🛠️  GraphQL Playground available at http://localhost:${PORT}${server.graphqlPath}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start Apollo Gateway:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start the gateway
if (require.main === module) {
  console.log('🚀 Starting Apollo Gateway...');
  startGateway();
}

module.exports = { startGateway }; 