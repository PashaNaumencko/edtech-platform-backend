// GraphQL Context for resolver type generation
export interface GraphQLContext {
  dataSources: {
    userService: any;
    learningService: any;
    paymentService: any;
  };
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  request: {
    headers: Record<string, string>;
  };
  requestId: string;
} 