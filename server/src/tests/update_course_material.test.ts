import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseMaterialsTable } from '../db/schema';
import { type UpdateCourseMaterialInput } from '../schema';
import { updateCourseMaterial } from '../handlers/update_course_material';
import { eq } from 'drizzle-orm';

describe('updateCourseMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCourseId: number;
  let testMaterialId: number;

  beforeEach(async () => {
    // Create test user (teacher)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: testUserId
      })
      .returning()
      .execute();
    testCourseId = courseResult[0].id;

    // Create test course material
    const materialResult = await db.insert(courseMaterialsTable)
      .values({
        course_id: testCourseId,
        title: 'Original Title',
        content: 'Original content',
        file_url: 'https://example.com/original.pdf'
      })
      .returning()
      .execute();
    testMaterialId = materialResult[0].id;
  });

  it('should update course material with all fields', async () => {
    const input: UpdateCourseMaterialInput = {
      id: testMaterialId,
      title: 'Updated Title',
      content: 'Updated content',
      file_url: 'https://example.com/updated.pdf'
    };

    const result = await updateCourseMaterial(input);

    expect(result.id).toEqual(testMaterialId);
    expect(result.course_id).toEqual(testCourseId);
    expect(result.title).toEqual('Updated Title');
    expect(result.content).toEqual('Updated content');
    expect(result.file_url).toEqual('https://example.com/updated.pdf');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const input: UpdateCourseMaterialInput = {
      id: testMaterialId,
      title: 'New Title Only'
    };

    const result = await updateCourseMaterial(input);

    expect(result.id).toEqual(testMaterialId);
    expect(result.title).toEqual('New Title Only');
    expect(result.content).toEqual('Original content'); // Should remain unchanged
    expect(result.file_url).toEqual('https://example.com/original.pdf'); // Should remain unchanged
  });

  it('should update content to null', async () => {
    const input: UpdateCourseMaterialInput = {
      id: testMaterialId,
      content: null
    };

    const result = await updateCourseMaterial(input);

    expect(result.id).toEqual(testMaterialId);
    expect(result.content).toBeNull();
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.file_url).toEqual('https://example.com/original.pdf'); // Should remain unchanged
  });

  it('should update file_url to null', async () => {
    const input: UpdateCourseMaterialInput = {
      id: testMaterialId,
      file_url: null
    };

    const result = await updateCourseMaterial(input);

    expect(result.id).toEqual(testMaterialId);
    expect(result.file_url).toBeNull();
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.content).toEqual('Original content'); // Should remain unchanged
  });

  it('should update material in database', async () => {
    const input: UpdateCourseMaterialInput = {
      id: testMaterialId,
      title: 'Database Updated Title',
      content: 'Database updated content'
    };

    await updateCourseMaterial(input);

    // Verify the update was saved to database
    const materials = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, testMaterialId))
      .execute();

    expect(materials).toHaveLength(1);
    expect(materials[0].title).toEqual('Database Updated Title');
    expect(materials[0].content).toEqual('Database updated content');
    expect(materials[0].file_url).toEqual('https://example.com/original.pdf');
    expect(materials[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalMaterial = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, testMaterialId))
      .execute();
    const originalUpdatedAt = originalMaterial[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCourseMaterialInput = {
      id: testMaterialId,
      title: 'Timestamp Test'
    };

    const result = await updateCourseMaterial(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent course material', async () => {
    const input: UpdateCourseMaterialInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    expect(updateCourseMaterial(input)).rejects.toThrow(/not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const input: UpdateCourseMaterialInput = {
      id: testMaterialId
      // No fields to update except updated_at
    };

    const result = await updateCourseMaterial(input);

    expect(result.id).toEqual(testMaterialId);
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.content).toEqual('Original content'); // Should remain unchanged
    expect(result.file_url).toEqual('https://example.com/original.pdf'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});