import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type GetCoursesByTeacherInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const getCoursesByTeacher = async (input: GetCoursesByTeacherInput): Promise<Course[]> => {
  try {
    // Query courses where teacher_id matches the input
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.teacher_id, input.teacher_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get courses by teacher:', error);
    throw error;
  }
};