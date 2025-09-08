import { db } from '../db';
import { usersTable, enrollmentsTable } from '../db/schema';
import { type GetCourseStudentsInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCourseStudents(input: GetCourseStudentsInput): Promise<User[]> {
  try {
    // Join enrollments and users tables to get student information for a course
    const results = await db.select()
      .from(enrollmentsTable)
      .innerJoin(usersTable, eq(enrollmentsTable.student_id, usersTable.id))
      .where(eq(enrollmentsTable.course_id, input.course_id))
      .execute();

    // Extract user data from joined results
    return results.map(result => result.users);
  } catch (error) {
    console.error('Failed to get course students:', error);
    throw error;
  }
}