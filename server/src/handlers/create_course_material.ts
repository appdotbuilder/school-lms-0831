import { db } from '../db';
import { courseMaterialsTable, coursesTable } from '../db/schema';
import { type CreateCourseMaterialInput, type CourseMaterial } from '../schema';
import { eq } from 'drizzle-orm';

export const createCourseMaterial = async (input: CreateCourseMaterialInput): Promise<CourseMaterial> => {
  try {
    // First, verify that the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .limit(1)
      .execute();

    if (course.length === 0) {
      throw new Error(`Course with ID ${input.course_id} does not exist`);
    }

    // Insert course material record
    const result = await db.insert(courseMaterialsTable)
      .values({
        course_id: input.course_id,
        title: input.title,
        content: input.content,
        file_url: input.file_url
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course material creation failed:', error);
    throw error;
  }
};