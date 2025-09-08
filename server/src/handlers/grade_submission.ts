import { db } from '../db';
import { assignmentSubmissionsTable } from '../db/schema';
import { type GradeSubmissionInput, type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export async function gradeSubmission(input: GradeSubmissionInput): Promise<AssignmentSubmission> {
  try {
    // Update the submission with the grade and graded_at timestamp
    const result = await db.update(assignmentSubmissionsTable)
      .set({
        grade: input.grade,
        graded_at: new Date()
      })
      .where(eq(assignmentSubmissionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Assignment submission with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const submission = result[0];
    return {
      ...submission,
      grade: submission.grade !== null ? parseFloat(submission.grade.toString()) : null
    };
  } catch (error) {
    console.error('Grade submission failed:', error);
    throw error;
  }
}