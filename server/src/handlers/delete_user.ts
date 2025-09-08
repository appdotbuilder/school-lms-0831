import { db } from '../db';
import { usersTable, enrollmentsTable, assignmentSubmissionsTable, coursesTable } from '../db/schema';
import { type DeleteUserInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteUser = async (input: DeleteUserInput): Promise<{ success: boolean }> => {
  try {
    // First verify the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    const user = existingUser[0];

    // Handle cascading deletes based on user role
    if (user.role === 'student') {
      // Delete student's enrollments
      await db.delete(enrollmentsTable)
        .where(eq(enrollmentsTable.student_id, input.id))
        .execute();

      // Delete student's assignment submissions
      await db.delete(assignmentSubmissionsTable)
        .where(eq(assignmentSubmissionsTable.student_id, input.id))
        .execute();
    } else if (user.role === 'teacher') {
      // For teachers, we need to check if they have any courses
      // If they do, we can't delete them (or we need to handle course reassignment)
      const teacherCourses = await db.select()
        .from(coursesTable)
        .where(eq(coursesTable.teacher_id, input.id))
        .execute();

      if (teacherCourses.length > 0) {
        throw new Error(`Cannot delete teacher: user has ${teacherCourses.length} active courses`);
      }
    }

    // Delete the user record
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};