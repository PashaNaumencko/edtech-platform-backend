export interface DrizzleConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  schema?: string;
}

export interface DrizzleMigrationConfig extends DrizzleConfig {
  migrationsFolder: string;
}