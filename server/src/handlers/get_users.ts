import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUsersInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUsers(input?: GetUsersInput): Promise<User[]> {
  try {
    // Build base query
    const baseQuery = db.select().from(usersTable);

    // Apply filter if provided
    const query = input?.role 
      ? baseQuery.where(eq(usersTable.role, input.role))
      : baseQuery;

    const results = await query.execute();

    return results;
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
}