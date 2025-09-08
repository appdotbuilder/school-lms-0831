import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const createCourse = async (input: CreateCourseInput): Promise<Course> => {
  try {
    // First, validate that the teacher_id exists and has teacher role
    const teacher = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.teacher_id))
      .execute();

    if (teacher.length === 0) {
      throw new Error('Teacher not found');
    }

    if (teacher[0].role !== 'teacher' && teacher[0].role !== 'administrator') {
      throw new Error('User must be a teacher or administrator to create a course');
    }

    // Insert course record
    const result = await db.insert(coursesTable)
      .values({
        name: input.name,
        description: input.description,
        teacher_id: input.teacher_id
      })
      .returning()
      .execute();

    const course = result[0];
    return course;
  } catch (error) {
    console.error('Course creation failed:', error);
    throw error;
  }
};