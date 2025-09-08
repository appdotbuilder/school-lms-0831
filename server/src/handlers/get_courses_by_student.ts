import { db } from '../db';
import { coursesTable, enrollmentsTable } from '../db/schema';
import { type GetCoursesByStudentInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCoursesByStudent(input: GetCoursesByStudentInput): Promise<Course[]> {
  try {
    // Join enrollments with courses to get all courses for the student
    const results = await db.select({
      id: coursesTable.id,
      name: coursesTable.name,
      description: coursesTable.description,
      teacher_id: coursesTable.teacher_id,
      created_at: coursesTable.created_at,
      updated_at: coursesTable.updated_at
    })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.course_id, coursesTable.id))
    .where(eq(enrollmentsTable.student_id, input.student_id))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get courses by student:', error);
    throw error;
  }
}