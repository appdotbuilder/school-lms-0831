import { db } from '../db';
import { courseMaterialsTable } from '../db/schema';
import { type DeleteCourseMaterialInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteCourseMaterial = async (input: DeleteCourseMaterialInput): Promise<{ success: boolean }> => {
  try {
    // Verify the course material exists before attempting to delete
    const existingMaterial = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, input.id))
      .execute();

    if (existingMaterial.length === 0) {
      throw new Error(`Course material with id ${input.id} not found`);
    }

    // Delete the course material
    const result = await db.delete(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Course material deletion failed:', error);
    throw error;
  }
};