import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUsersInput, type CreateUserInput, type UserRole } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all users when no filter is provided', async () => {
    // Create test users
    const testUsers: CreateUserInput[] = [
      {
        email: 'student1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      },
      {
        email: 'teacher1@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      },
      {
        email: 'admin1@example.com',
        first_name: 'Bob',
        last_name: 'Admin',
        role: 'administrator'
      }
    ];

    // Insert test users
    for (const user of testUsers) {
      await db.insert(usersTable).values(user).execute();
    }

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result.map(u => u.email).sort()).toEqual([
      'admin1@example.com',
      'student1@example.com', 
      'teacher1@example.com'
    ]);
  });

  it('should return only students when filtered by student role', async () => {
    // Create test users with different roles
    const testUsers: CreateUserInput[] = [
      {
        email: 'student1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      },
      {
        email: 'student2@example.com',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'student'
      },
      {
        email: 'teacher1@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      }
    ];

    // Insert test users
    for (const user of testUsers) {
      await db.insert(usersTable).values(user).execute();
    }

    const input: GetUsersInput = { role: 'student' };
    const result = await getUsers(input);

    expect(result).toHaveLength(2);
    result.forEach(user => {
      expect(user.role).toEqual('student');
    });
    expect(result.map(u => u.email).sort()).toEqual([
      'student1@example.com',
      'student2@example.com'
    ]);
  });

  it('should return only teachers when filtered by teacher role', async () => {
    // Create test users
    const testUsers: CreateUserInput[] = [
      {
        email: 'teacher1@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      },
      {
        email: 'teacher2@example.com',
        first_name: 'Mark',
        last_name: 'Wilson',
        role: 'teacher'
      },
      {
        email: 'student1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      }
    ];

    // Insert test users
    for (const user of testUsers) {
      await db.insert(usersTable).values(user).execute();
    }

    const input: GetUsersInput = { role: 'teacher' };
    const result = await getUsers(input);

    expect(result).toHaveLength(2);
    result.forEach(user => {
      expect(user.role).toEqual('teacher');
    });
    expect(result.map(u => u.email).sort()).toEqual([
      'teacher1@example.com',
      'teacher2@example.com'
    ]);
  });

  it('should return only administrators when filtered by administrator role', async () => {
    // Create test users
    const testUsers: CreateUserInput[] = [
      {
        email: 'admin1@example.com',
        first_name: 'Bob',
        last_name: 'Admin',
        role: 'administrator'
      },
      {
        email: 'student1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      },
      {
        email: 'teacher1@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'teacher'
      }
    ];

    // Insert test users
    for (const user of testUsers) {
      await db.insert(usersTable).values(user).execute();
    }

    const input: GetUsersInput = { role: 'administrator' };
    const result = await getUsers(input);

    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual('administrator');
    expect(result[0].email).toEqual('admin1@example.com');
  });

  it('should return empty array when no users match the filter', async () => {
    // Create a student user
    const testUser: CreateUserInput = {
      email: 'student1@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'student'
    };

    await db.insert(usersTable).values(testUser).execute();

    // Filter by teacher role - should return empty array
    const input: GetUsersInput = { role: 'teacher' };
    const result = await getUsers(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toHaveLength(0);
  });

  it('should return users with correct field types and values', async () => {
    // Create a test user
    const testUser: CreateUserInput = {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'student'
    };

    await db.insert(usersTable).values(testUser).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required fields exist and have correct types
    expect(typeof user.id).toBe('number');
    expect(user.email).toEqual('test@example.com');
    expect(user.first_name).toEqual('Test');
    expect(user.last_name).toEqual('User');
    expect(user.role).toEqual('student');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});