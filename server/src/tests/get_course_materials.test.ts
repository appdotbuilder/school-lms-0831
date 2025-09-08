import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseMaterialsTable } from '../db/schema';
import { type GetCourseMaterialsInput } from '../schema';
import { getCourseMaterials } from '../handlers/get_course_materials';

describe('getCourseMaterials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return course materials for a course', async () => {
    // Create a teacher user
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course
    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    // Create course materials
    await db.insert(courseMaterialsTable)
      .values([
        {
          course_id: course.id,
          title: 'Lecture Notes 1',
          content: 'Introduction to the course',
          file_url: 'https://example.com/lecture1.pdf'
        },
        {
          course_id: course.id,
          title: 'Assignment Instructions',
          content: null,
          file_url: 'https://example.com/assignment.pdf'
        }
      ])
      .execute();

    const input: GetCourseMaterialsInput = {
      course_id: course.id
    };

    const result = await getCourseMaterials(input);

    expect(result).toHaveLength(2);
    
    // Check first material
    expect(result[0].title).toEqual('Lecture Notes 1');
    expect(result[0].content).toEqual('Introduction to the course');
    expect(result[0].file_url).toEqual('https://example.com/lecture1.pdf');
    expect(result[0].course_id).toEqual(course.id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second material
    expect(result[1].title).toEqual('Assignment Instructions');
    expect(result[1].content).toBeNull();
    expect(result[1].file_url).toEqual('https://example.com/assignment.pdf');
    expect(result[1].course_id).toEqual(course.id);
  });

  it('should return empty array for course with no materials', async () => {
    // Create a teacher user
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course
    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Empty Course',
        description: 'A course with no materials',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const input: GetCourseMaterialsInput = {
      course_id: course.id
    };

    const result = await getCourseMaterials(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent course', async () => {
    const input: GetCourseMaterialsInput = {
      course_id: 999999 // Non-existent course ID
    };

    const result = await getCourseMaterials(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return materials ordered by creation date', async () => {
    // Create a teacher user
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course
    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    // Create multiple course materials with slight delays to ensure different timestamps
    const material1 = await db.insert(courseMaterialsTable)
      .values({
        course_id: course.id,
        title: 'First Material',
        content: 'First content',
        file_url: null
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const material2 = await db.insert(courseMaterialsTable)
      .values({
        course_id: course.id,
        title: 'Second Material',
        content: 'Second content',
        file_url: null
      })
      .returning()
      .execute();

    const input: GetCourseMaterialsInput = {
      course_id: course.id
    };

    const result = await getCourseMaterials(input);

    expect(result).toHaveLength(2);
    
    // Materials should be returned in the order they were created (database default order)
    const firstResult = result.find(m => m.title === 'First Material');
    const secondResult = result.find(m => m.title === 'Second Material');
    
    expect(firstResult).toBeDefined();
    expect(secondResult).toBeDefined();
    expect(firstResult!.created_at <= secondResult!.created_at).toBe(true);
  });

  it('should handle materials with null content and file_url', async () => {
    // Create a teacher user
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course
    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    // Create a material with null content and file_url
    await db.insert(courseMaterialsTable)
      .values({
        course_id: course.id,
        title: 'Material with Nulls',
        content: null,
        file_url: null
      })
      .execute();

    const input: GetCourseMaterialsInput = {
      course_id: course.id
    };

    const result = await getCourseMaterials(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Material with Nulls');
    expect(result[0].content).toBeNull();
    expect(result[0].file_url).toBeNull();
    expect(result[0].course_id).toEqual(course.id);
  });
});