import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * User ORM Entity
 *
 * Simplified database entity matching our domain User entity.
 * Focuses on essential data for Day 13.
 */
@Entity("users")
@Index(["email"], { unique: true })
@Index(["role"])
@Index(["status"])
export class UserOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: "enum",
    enum: ["student", "tutor", "admin", "superadmin"],
    default: "student",
  })
  role: string;

  @Column({
    type: "enum",
    enum: ["active", "inactive", "suspended", "pending_verification"],
    default: "pending_verification",
  })
  status: string;

  @Column({ type: "text", nullable: true })
  bio: string | null;

  @Column({ type: "simple-array", nullable: true })
  skills: string[] | null;

  @Column({ nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
