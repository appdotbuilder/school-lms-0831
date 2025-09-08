import { db } from '../db';
import { assignmentSubmissionsTable } from '../db/schema';
import { type GetStudentSubmissionsInput, type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export async function getStudentSubmissions(input: GetStudentSubmissionsInput): Promise<AssignmentSubmission[]> {
  try {
    // Query all submissions for the specific student
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.student_id, input.student_id))
      .execute();

    // Convert numeric fields back to numbers and ensure proper typing
    return results.map(submission => ({
      ...submission,
      grade: submission.grade !== null ? parseFloat(submission.grade.toString()) : null
    }));
  } catch (error) {
    console.error('Failed to fetch student submissions:', error);
    throw error;
  }
}