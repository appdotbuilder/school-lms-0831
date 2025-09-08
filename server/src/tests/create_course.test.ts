import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { createCourse } from '../handlers/create_course';
import { eq } from 'drizzle-orm';

describe('createCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let studentId: number;

  beforeEach(async () => {
    // Create prerequisite test data
    const teachers = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'Jane',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teachers[0].id;

    const students = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        first_name: 'John',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = students[0].id;
  });

  const testInput: CreateCourseInput = {
    name: 'Test Course',
    description: 'A course for testing',
    teacher_id: 0 // Will be set to actual teacherId in tests
  };

  it('should create a course with valid teacher', async () => {
    const input = { ...testInput, teacher_id: teacherId };
    const result = await createCourse(input);

    // Basic field validation
    expect(result.name).toEqual('Test Course');
    expect(result.description).toEqual('A course for testing');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save course to database', async () => {
    const input = { ...testInput, teacher_id: teacherId };
    const result = await createCourse(input);

    // Query the database to verify the course was saved
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].name).toEqual('Test Course');
    expect(courses[0].description).toEqual('A course for testing');
    expect(courses[0].teacher_id).toEqual(teacherId);
    expect(courses[0].created_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create course with null description', async () => {
    const input = { ...testInput, description: null, teacher_id: teacherId };
    const result = await createCourse(input);

    expect(result.name).toEqual('Test Course');
    expect(result.description).toBeNull();
    expect(result.teacher_id).toEqual(teacherId);
  });

  it('should allow administrators to create courses', async () => {
    // Create an administrator user
    const admins = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    const adminId = admins[0].id;

    const input = { ...testInput, teacher_id: adminId };
    const result = await createCourse(input);

    expect(result.name).toEqual('Test Course');
    expect(result.teacher_id).toEqual(adminId);
  });

  it('should throw error when teacher does not exist', async () => {
    const input = { ...testInput, teacher_id: 99999 };

    await expect(createCourse(input)).rejects.toThrow(/teacher not found/i);
  });

  it('should throw error when user is not teacher or administrator', async () => {
    const input = { ...testInput, teacher_id: studentId };

    await expect(createCourse(input)).rejects.toThrow(/user must be a teacher or administrator/i);
  });

  it('should create multiple courses for same teacher', async () => {
    const input1 = { ...testInput, name: 'Course 1', teacher_id: teacherId };
    const input2 = { ...testInput, name: 'Course 2', teacher_id: teacherId };

    const result1 = await createCourse(input1);
    const result2 = await createCourse(input2);

    expect(result1.name).toEqual('Course 1');
    expect(result2.name).toEqual('Course 2');
    expect(result1.teacher_id).toEqual(teacherId);
    expect(result2.teacher_id).toEqual(teacherId);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both courses exist in database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.teacher_id, teacherId))
      .execute();

    expect(courses).toHaveLength(2);
  });
});