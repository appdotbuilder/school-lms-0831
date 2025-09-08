import { db } from '../db';
import { courseMaterialsTable } from '../db/schema';
import { type GetCourseMaterialsInput, type CourseMaterial } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCourseMaterials(input: GetCourseMaterialsInput): Promise<CourseMaterial[]> {
  try {
    const results = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.course_id, input.course_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get course materials:', error);
    throw error;
  }
}