import { db } from '../db';
import { assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type DeleteAssignmentInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteAssignment(input: DeleteAssignmentInput): Promise<{ success: boolean }> {
  try {
    // First, delete all related assignment submissions (cascading delete)
    await db.delete(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, input.id))
      .execute();

    // Then delete the assignment itself
    const result = await db.delete(assignmentsTable)
      .where(eq(assignmentsTable.id, input.id))
      .returning()
      .execute();

    // Return success based on whether any rows were affected
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Assignment deletion failed:', error);
    throw error;
  }
}