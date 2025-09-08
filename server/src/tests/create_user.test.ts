import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for student user
const testStudentInput: CreateUserInput = {
  email: 'student@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

// Test input for teacher user
const testTeacherInput: CreateUserInput = {
  email: 'teacher@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'teacher'
};

// Test input for administrator user
const testAdminInput: CreateUserInput = {
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'administrator'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a student user', async () => {
    const result = await createUser(testStudentInput);

    // Basic field validation
    expect(result.email).toEqual('student@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a teacher user', async () => {
    const result = await createUser(testTeacherInput);

    expect(result.email).toEqual('teacher@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('teacher');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an administrator user', async () => {
    const result = await createUser(testAdminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.first_name).toEqual('Admin');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('administrator');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testStudentInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('student@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('student');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for multiple users', async () => {
    const user1 = await createUser(testStudentInput);
    const user2 = await createUser(testTeacherInput);
    const user3 = await createUser(testAdminInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.id).not.toEqual(user3.id);
    expect(user2.id).not.toEqual(user3.id);

    // Verify all users are saved in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);
  });

  it('should handle duplicate email addresses', async () => {
    // Create first user
    await createUser(testStudentInput);

    // Try to create second user with same email
    const duplicateEmailInput: CreateUserInput = {
      email: 'student@example.com', // Same email
      first_name: 'Different',
      last_name: 'Person',
      role: 'teacher'
    };

    // Should throw error due to unique constraint
    await expect(createUser(duplicateEmailInput)).rejects.toThrow();
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testStudentInput);
    const afterCreation = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should handle different user roles correctly', async () => {
    const roles = ['student', 'teacher', 'administrator'] as const;
    const createdUsers = [];

    for (const role of roles) {
      const input: CreateUserInput = {
        email: `${role}@example.com`,
        first_name: 'Test',
        last_name: 'User',
        role: role
      };
      
      const user = await createUser(input);
      createdUsers.push(user);
      expect(user.role).toEqual(role);
    }

    // Verify all users with different roles are in database
    const dbUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(dbUsers).toHaveLength(3);
    
    const dbRoles = dbUsers.map(u => u.role).sort();
    expect(dbRoles).toEqual(['administrator', 'student', 'teacher']);
  });
});