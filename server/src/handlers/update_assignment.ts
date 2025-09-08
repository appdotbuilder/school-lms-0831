import { db } from '../db';
import { assignmentsTable } from '../db/schema';
import { type UpdateAssignmentInput, type Assignment } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAssignment = async (input: UpdateAssignmentInput): Promise<Assignment> => {
  try {
    // Check if assignment exists
    const existingAssignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, input.id))
      .execute();

    if (existingAssignment.length === 0) {
      throw new Error(`Assignment with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }

    // Update the assignment
    const result = await db.update(assignmentsTable)
      .set(updateData)
      .where(eq(assignmentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Assignment update failed:', error);
    throw error;
  }
};