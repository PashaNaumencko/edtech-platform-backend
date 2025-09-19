import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@edtech/drizzle';
import { users, User as DrizzleUser } from '@edtech/drizzle/schemas';
import { IUserRepository } from '../../application/interfaces/repository.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async save(user: User): Promise<User> {
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      bio: user.bio || null,
      skills: user.skills || [],
      updatedAt: new Date(),
    };

    const [savedUser] = await this.drizzle.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          status: userData.status,
          bio: userData.bio,
          skills: userData.skills,
          updatedAt: userData.updatedAt,
        },
      })
      .returning();

    return this.mapToDomainEntity(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ? this.mapToDomainEntity(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ? this.mapToDomainEntity(user) : null;
  }

  async findAll(offset: number = 0, limit: number = 10): Promise<{ users: User[], total: number }> {
    const foundUsers = await this.drizzle.db
      .select()
      .from(users)
      .offset(offset)
      .limit(limit);

    const [{ count }] = await this.drizzle.db
      .select({ count: users.id })
      .from(users);

    return {
      users: foundUsers.map(user => this.mapToDomainEntity(user)),
      total: count,
    };
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db
      .delete(users)
      .where(eq(users.id, id));
  }

  private mapToDomainEntity(dbUser: DrizzleUser): User {
    const user = new User();
    user.mergeObjectContext({
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role,
      status: dbUser.status,
      bio: dbUser.bio,
      skills: Array.isArray(dbUser.skills) ? dbUser.skills : [],
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });
    return user;
  }
}