import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { courseMaterialsTable, usersTable, coursesTable } from '../db/schema';
import { type CreateCourseMaterialInput } from '../schema';
import { createCourseMaterial } from '../handlers/create_course_material';
import { eq } from 'drizzle-orm';

describe('createCourseMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCourseId: number;

  beforeEach(async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    testCourseId = courseResult[0].id;
  });

  const testInput: CreateCourseMaterialInput = {
    course_id: 0, // Will be set to testCourseId in tests
    title: 'Test Material',
    content: 'This is test content for the course material',
    file_url: 'https://example.com/test-file.pdf'
  };

  it('should create a course material', async () => {
    const input = { ...testInput, course_id: testCourseId };
    const result = await createCourseMaterial(input);

    // Basic field validation
    expect(result.title).toEqual('Test Material');
    expect(result.content).toEqual(testInput.content);
    expect(result.file_url).toEqual(testInput.file_url);
    expect(result.course_id).toEqual(testCourseId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save course material to database', async () => {
    const input = { ...testInput, course_id: testCourseId };
    const result = await createCourseMaterial(input);

    // Query using proper drizzle syntax
    const materials = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, result.id))
      .execute();

    expect(materials).toHaveLength(1);
    expect(materials[0].title).toEqual('Test Material');
    expect(materials[0].content).toEqual(testInput.content);
    expect(materials[0].file_url).toEqual(testInput.file_url);
    expect(materials[0].course_id).toEqual(testCourseId);
    expect(materials[0].created_at).toBeInstanceOf(Date);
    expect(materials[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create course material with null content', async () => {
    const input: CreateCourseMaterialInput = {
      course_id: testCourseId,
      title: 'File Only Material',
      content: null,
      file_url: 'https://example.com/document.pdf'
    };

    const result = await createCourseMaterial(input);

    expect(result.title).toEqual('File Only Material');
    expect(result.content).toBeNull();
    expect(result.file_url).toEqual('https://example.com/document.pdf');
    expect(result.course_id).toEqual(testCourseId);
  });

  it('should create course material with null file_url', async () => {
    const input: CreateCourseMaterialInput = {
      course_id: testCourseId,
      title: 'Text Only Material',
      content: 'This is text-only content',
      file_url: null
    };

    const result = await createCourseMaterial(input);

    expect(result.title).toEqual('Text Only Material');
    expect(result.content).toEqual('This is text-only content');
    expect(result.file_url).toBeNull();
    expect(result.course_id).toEqual(testCourseId);
  });

  it('should create course material with both content and file_url as null', async () => {
    const input: CreateCourseMaterialInput = {
      course_id: testCourseId,
      title: 'Title Only Material',
      content: null,
      file_url: null
    };

    const result = await createCourseMaterial(input);

    expect(result.title).toEqual('Title Only Material');
    expect(result.content).toBeNull();
    expect(result.file_url).toBeNull();
    expect(result.course_id).toEqual(testCourseId);
  });

  it('should throw error for non-existent course', async () => {
    const input: CreateCourseMaterialInput = {
      course_id: 99999, // Non-existent course ID
      title: 'Test Material',
      content: 'Test content',
      file_url: null
    };

    await expect(createCourseMaterial(input)).rejects.toThrow(/course with id 99999 does not exist/i);
  });

  it('should create multiple materials for the same course', async () => {
    const input1: CreateCourseMaterialInput = {
      course_id: testCourseId,
      title: 'Material 1',
      content: 'Content 1',
      file_url: null
    };

    const input2: CreateCourseMaterialInput = {
      course_id: testCourseId,
      title: 'Material 2',
      content: null,
      file_url: 'https://example.com/file2.pdf'
    };

    const result1 = await createCourseMaterial(input1);
    const result2 = await createCourseMaterial(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.course_id).toEqual(testCourseId);
    expect(result2.course_id).toEqual(testCourseId);

    // Verify both materials exist in database
    const materials = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.course_id, testCourseId))
      .execute();

    expect(materials).toHaveLength(2);
  });
});