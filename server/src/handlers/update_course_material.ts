import { db } from '../db';
import { courseMaterialsTable } from '../db/schema';
import { type UpdateCourseMaterialInput, type CourseMaterial } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCourseMaterial = async (input: UpdateCourseMaterialInput): Promise<CourseMaterial> => {
  try {
    // First, verify the course material exists
    const existingMaterial = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, input.id))
      .execute();

    if (existingMaterial.length === 0) {
      throw new Error(`Course material with id ${input.id} not found`);
    }

    // Prepare update data - only include fields that are provided
    const updateData: Partial<typeof courseMaterialsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    if (input.file_url !== undefined) {
      updateData.file_url = input.file_url;
    }

    // Update the course material
    const result = await db.update(courseMaterialsTable)
      .set(updateData)
      .where(eq(courseMaterialsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course material update failed:', error);
    throw error;
  }
};