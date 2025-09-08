import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type UpdateCourseInput, type Course } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateCourse = async (input: UpdateCourseInput): Promise<Course> => {
  try {
    // First, verify the course exists
    const existingCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.id))
      .execute();

    if (existingCourse.length === 0) {
      throw new Error(`Course with id ${input.id} not found`);
    }

    // If teacher_id is being updated, verify the new teacher exists and is a teacher
    if (input.teacher_id !== undefined) {
      const teacher = await db.select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, input.teacher_id),
            eq(usersTable.role, 'teacher')
          )
        )
        .execute();

      if (teacher.length === 0) {
        throw new Error(`Teacher with id ${input.teacher_id} not found or user is not a teacher`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.teacher_id !== undefined) {
      updateData.teacher_id = input.teacher_id;
    }

    // Update the course
    const result = await db.update(coursesTable)
      .set(updateData)
      .where(eq(coursesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course update failed:', error);
    throw error;
  }
};