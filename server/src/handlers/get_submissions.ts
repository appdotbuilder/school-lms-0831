import { db } from '../db';
import { assignmentSubmissionsTable, usersTable } from '../db/schema';
import { type GetSubmissionsInput, type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export async function getSubmissions(input: GetSubmissionsInput): Promise<AssignmentSubmission[]> {
  try {
    // Query all submissions for the specified assignment
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .innerJoin(usersTable, eq(assignmentSubmissionsTable.student_id, usersTable.id))
      .where(eq(assignmentSubmissionsTable.assignment_id, input.assignment_id))
      .execute();

    // Transform the joined results back to AssignmentSubmission format
    return results.map(result => {
      const submission = result.assignment_submissions;
      return {
        ...submission,
        grade: submission.grade ? parseFloat(submission.grade.toString()) : null, // Convert numeric field
      };
    });
  } catch (error) {
    console.error('Get submissions failed:', error);
    throw error;
  }
}