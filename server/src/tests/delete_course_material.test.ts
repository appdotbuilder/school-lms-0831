import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { courseMaterialsTable, usersTable, coursesTable } from '../db/schema';
import { type DeleteCourseMaterialInput } from '../schema';
import { deleteCourseMaterial } from '../handlers/delete_course_material';
import { eq } from 'drizzle-orm';

describe('deleteCourseMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing course material', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create a course material
    const materialResult = await db.insert(courseMaterialsTable)
      .values({
        course_id: courseId,
        title: 'Test Material',
        content: 'Test content',
        file_url: 'https://example.com/file.pdf'
      })
      .returning()
      .execute();

    const materialId = materialResult[0].id;

    const input: DeleteCourseMaterialInput = {
      id: materialId
    };

    // Delete the course material
    const result = await deleteCourseMaterial(input);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify the material is actually deleted from the database
    const deletedMaterial = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, materialId))
      .execute();

    expect(deletedMaterial).toHaveLength(0);
  });

  it('should throw error when trying to delete non-existent course material', async () => {
    const nonExistentId = 99999;
    const input: DeleteCourseMaterialInput = {
      id: nonExistentId
    };

    // Attempt to delete non-existent material should throw error
    await expect(deleteCourseMaterial(input)).rejects.toThrow(/Course material with id 99999 not found/i);
  });

  it('should handle database constraints properly', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create multiple course materials to test individual deletion
    const material1 = await db.insert(courseMaterialsTable)
      .values({
        course_id: courseId,
        title: 'Material 1',
        content: 'Content 1',
        file_url: null
      })
      .returning()
      .execute();

    const material2 = await db.insert(courseMaterialsTable)
      .values({
        course_id: courseId,
        title: 'Material 2',
        content: 'Content 2',
        file_url: 'https://example.com/file2.pdf'
      })
      .returning()
      .execute();

    const material1Id = material1[0].id;
    const material2Id = material2[0].id;

    // Delete only the first material
    const input: DeleteCourseMaterialInput = {
      id: material1Id
    };

    const result = await deleteCourseMaterial(input);
    expect(result.success).toBe(true);

    // Verify first material is deleted
    const deletedMaterial = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, material1Id))
      .execute();

    expect(deletedMaterial).toHaveLength(0);

    // Verify second material still exists
    const remainingMaterial = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, material2Id))
      .execute();

    expect(remainingMaterial).toHaveLength(1);
    expect(remainingMaterial[0].title).toBe('Material 2');
  });

  it('should delete material with nullable fields correctly', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create a course material with nullable fields
    const materialResult = await db.insert(courseMaterialsTable)
      .values({
        course_id: courseId,
        title: 'Material with Nulls',
        content: null,
        file_url: null
      })
      .returning()
      .execute();

    const materialId = materialResult[0].id;

    const input: DeleteCourseMaterialInput = {
      id: materialId
    };

    // Delete the course material with nullable fields
    const result = await deleteCourseMaterial(input);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify the material is actually deleted from the database
    const deletedMaterial = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, materialId))
      .execute();

    expect(deletedMaterial).toHaveLength(0);
  });
});