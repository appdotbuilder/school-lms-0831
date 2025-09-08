import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type UpdateCourseInput, type CreateUserInput, type CreateCourseInput } from '../schema';
import { updateCourse } from '../handlers/update_course';
import { eq } from 'drizzle-orm';

// Test users
const teacherInput: CreateUserInput = {
  email: 'teacher1@example.com',
  first_name: 'John',
  last_name: 'Teacher',
  role: 'teacher'
};

const newTeacherInput: CreateUserInput = {
  email: 'teacher2@example.com',
  first_name: 'Jane',
  last_name: 'Instructor',
  role: 'teacher'
};

const studentInput: CreateUserInput = {
  email: 'student@example.com',
  first_name: 'Bob',
  last_name: 'Student',
  role: 'student'
};

// Test course
const courseInput: CreateCourseInput = {
  name: 'Original Course',
  description: 'Original description',
  teacher_id: 1 // Will be set after creating teacher
};

describe('updateCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let newTeacherId: number;
  let courseId: number;

  beforeEach(async () => {
    // Create test teachers
    const teacherResult = await db.insert(usersTable)
      .values(teacherInput)
      .returning()
      .execute();
    teacherId = teacherResult[0].id;

    const newTeacherResult = await db.insert(usersTable)
      .values(newTeacherInput)
      .returning()
      .execute();
    newTeacherId = newTeacherResult[0].id;

    // Create a student for validation tests
    await db.insert(usersTable)
      .values(studentInput)
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...courseInput,
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;
  });

  it('should update course name only', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      name: 'Updated Course Name'
    };

    const result = await updateCourse(updateInput);

    expect(result.id).toEqual(courseId);
    expect(result.name).toEqual('Updated Course Name');
    expect(result.description).toEqual('Original description');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update course description only', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      description: 'Updated description'
    };

    const result = await updateCourse(updateInput);

    expect(result.name).toEqual('Original Course');
    expect(result.description).toEqual('Updated description');
    expect(result.teacher_id).toEqual(teacherId);
  });

  it('should update course description to null', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      description: null
    };

    const result = await updateCourse(updateInput);

    expect(result.description).toBeNull();
  });

  it('should update teacher_id only', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      teacher_id: newTeacherId
    };

    const result = await updateCourse(updateInput);

    expect(result.name).toEqual('Original Course');
    expect(result.description).toEqual('Original description');
    expect(result.teacher_id).toEqual(newTeacherId);
  });

  it('should update all fields at once', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      name: 'Completely New Course',
      description: 'New description',
      teacher_id: newTeacherId
    };

    const result = await updateCourse(updateInput);

    expect(result.name).toEqual('Completely New Course');
    expect(result.description).toEqual('New description');
    expect(result.teacher_id).toEqual(newTeacherId);
  });

  it('should persist changes in database', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      name: 'Database Test Course',
      description: 'Testing persistence'
    };

    await updateCourse(updateInput);

    // Verify changes were saved to database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].name).toEqual('Database Test Course');
    expect(courses[0].description).toEqual('Testing persistence');
  });

  it('should update updated_at timestamp', async () => {
    const originalCourse = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCourseInput = {
      id: courseId,
      name: 'Timestamp Test'
    };

    const result = await updateCourse(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalCourse[0].updated_at.getTime());
  });

  it('should throw error for non-existent course', async () => {
    const updateInput: UpdateCourseInput = {
      id: 99999,
      name: 'Non-existent Course'
    };

    await expect(updateCourse(updateInput)).rejects.toThrow(/course with id 99999 not found/i);
  });

  it('should throw error for non-existent teacher', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      teacher_id: 99999
    };

    await expect(updateCourse(updateInput)).rejects.toThrow(/teacher with id 99999 not found/i);
  });

  it('should throw error when assigning course to student', async () => {
    // Get student ID (created as third user)
    const students = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'student'))
      .execute();

    const updateInput: UpdateCourseInput = {
      id: courseId,
      teacher_id: students[0].id
    };

    await expect(updateCourse(updateInput)).rejects.toThrow(/not found or user is not a teacher/i);
  });

  it('should handle partial updates with undefined values', async () => {
    const updateInput: UpdateCourseInput = {
      id: courseId,
      name: 'Only Name Updated',
      description: undefined, // Should not update this field
      teacher_id: undefined   // Should not update this field
    };

    const result = await updateCourse(updateInput);

    expect(result.name).toEqual('Only Name Updated');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.teacher_id).toEqual(teacherId); // Should remain unchanged
  });
});