import { db } from '../db';
import { 
  coursesTable, 
  enrollmentsTable, 
  courseMaterialsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { type DeleteCourseInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteCourse(input: DeleteCourseInput): Promise<{ success: boolean }> {
  try {
    // Delete in the correct order to handle foreign key constraints
    // 1. First delete assignment submissions
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, input.id))
      .execute();

    for (const assignment of assignments) {
      await db.delete(assignmentSubmissionsTable)
        .where(eq(assignmentSubmissionsTable.assignment_id, assignment.id))
        .execute();
    }

    // 2. Delete assignments
    await db.delete(assignmentsTable)
      .where(eq(assignmentsTable.course_id, input.id))
      .execute();

    // 3. Delete course materials
    await db.delete(courseMaterialsTable)
      .where(eq(courseMaterialsTable.course_id, input.id))
      .execute();

    // 4. Delete enrollments
    await db.delete(enrollmentsTable)
      .where(eq(enrollmentsTable.course_id, input.id))
      .execute();

    // 5. Finally delete the course itself
    const result = await db.delete(coursesTable)
      .where(eq(coursesTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Course deletion failed:', error);
    throw error;
  }
}