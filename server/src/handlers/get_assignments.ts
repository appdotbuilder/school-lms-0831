import { db } from '../db';
import { assignmentsTable } from '../db/schema';
import { type GetAssignmentsInput, type Assignment } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssignments = async (input: GetAssignmentsInput): Promise<Assignment[]> => {
  try {
    const results = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, input.course_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get assignments:', error);
    throw error;
  }
};