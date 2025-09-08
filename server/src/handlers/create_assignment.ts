import { db } from '../db';
import { assignmentsTable, coursesTable } from '../db/schema';
import { type CreateAssignmentInput, type Assignment } from '../schema';
import { eq } from 'drizzle-orm';

export const createAssignment = async (input: CreateAssignmentInput): Promise<Assignment> => {
  try {
    // First, verify that the course exists
    const existingCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (existingCourse.length === 0) {
      throw new Error(`Course with id ${input.course_id} does not exist`);
    }

    // Insert assignment record
    const result = await db.insert(assignmentsTable)
      .values({
        course_id: input.course_id,
        title: input.title,
        description: input.description,
        due_date: input.due_date
      })
      .returning()
      .execute();

    const assignment = result[0];
    return assignment;
  } catch (error) {
    console.error('Assignment creation failed:', error);
    throw error;
  }
};