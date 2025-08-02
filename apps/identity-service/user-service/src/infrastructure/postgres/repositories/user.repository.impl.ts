import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { IUserRepository } from "../../../application/interfaces/repository.interface";
import { User } from "../../../domain/entities/user.entity";
import { UserOrmEntity } from "../entities/user.orm-entity";

/**
 * User Repository Implementation
 *
 * Simplified implementation using TypeORM.
 * Maps between domain entities and ORM entities.
 */
@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>
  ) {}

  async save(user: User): Promise<void> {
    const ormEntity = this.toOrmEntity(user);
    await this.userRepository.save(ormEntity);
  }

  async findById(id: string): Promise<User | null> {
    const ormEntity = await this.userRepository.findOne({
      where: { id },
    });

    return ormEntity ? this.toDomainEntity(ormEntity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const ormEntity = await this.userRepository.findOne({
      where: { email },
    });

    return ormEntity ? this.toDomainEntity(ormEntity) : null;
  }

  async findAll(offset: number, limit: number): Promise<{ users: User[]; total: number }> {
    const [ormEntities, total] = await this.userRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { createdAt: "DESC" },
    });

    const users = ormEntities.map((entity) => this.toDomainEntity(entity));
    return { users, total };
  }

  async delete(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.userRepository.count({ where: { email } });
    return count > 0;
  }

  /**
   * Maps domain User entity to ORM entity
   */
  private toOrmEntity(user: User): UserOrmEntity {
    const ormEntity = new UserOrmEntity();
    ormEntity.id = user.id;
    ormEntity.email = user.email;
    ormEntity.firstName = user.firstName;
    ormEntity.lastName = user.lastName;
    ormEntity.role = user.role;
    ormEntity.status = user.status;
    ormEntity.bio = user.bio || null;
    ormEntity.skills = user.skills.length > 0 ? user.skills : null;
    ormEntity.lastLoginAt = user.lastLoginAt || null;
    return ormEntity;
  }

  /**
   * Maps ORM entity to domain User entity using mergeObjectContext
   */
  private toDomainEntity(ormEntity: UserOrmEntity): User {
    const user = new User();
    user.mergeObjectContext({
      id: ormEntity.id,
      email: ormEntity.email,
      firstName: ormEntity.firstName,
      lastName: ormEntity.lastName,
      role: ormEntity.role,
      status: ormEntity.status,
      bio: ormEntity.bio || undefined,
      skills: ormEntity.skills || [],
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      lastLoginAt: ormEntity.lastLoginAt || undefined,
    });
    return user;
  }
}
