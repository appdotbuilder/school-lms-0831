import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user for updating
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();
    
    testUserId = result[0].id;
  });

  it('should update user email', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      email: 'updated@example.com'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUserId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.last_name).toEqual('Doe'); // Unchanged
    expect(result.role).toEqual('student'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user names', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUserId);
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('student'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user role', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      role: 'teacher'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUserId);
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.last_name).toEqual('Doe'); // Unchanged
    expect(result.role).toEqual('teacher');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'administrator'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUserId);
    expect(result.email).toEqual('admin@example.com');
    expect(result.first_name).toEqual('Admin');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('administrator');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user in database', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      email: 'updated@example.com',
      role: 'teacher'
    };

    await updateUser(input);

    // Verify the user was actually updated in the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];
    expect(user.email).toEqual('updated@example.com');
    expect(user.role).toEqual('teacher');
    expect(user.first_name).toEqual('John'); // Unchanged
    expect(user.last_name).toEqual('Doe'); // Unchanged
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get the original user
    const originalUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();
    
    const originalUpdatedAt = originalUsers[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateUserInput = {
      id: testUserId,
      email: 'newemail@example.com'
    };

    const result = await updateUser(input);

    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const input: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      email: 'test@example.com'
    };

    await expect(updateUser(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle updating with only id provided', async () => {
    const input: UpdateUserInput = {
      id: testUserId
    };

    const result = await updateUser(input);

    // Should return the user with only updated_at changed
    expect(result.id).toEqual(testUserId);
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('student');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle email uniqueness constraint', async () => {
    // Create another user
    const anotherUser = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        first_name: 'Another',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: testUserId,
      email: 'another@example.com' // Try to use existing email
    };

    await expect(updateUser(input)).rejects.toThrow();
  });
});