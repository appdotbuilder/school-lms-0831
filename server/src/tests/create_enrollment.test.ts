import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, enrollmentsTable } from '../db/schema';
import { type CreateEnrollmentInput } from '../schema';
import { createEnrollment } from '../handlers/create_enrollment';
import { eq, and } from 'drizzle-orm';

describe('createEnrollment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an enrollment for a valid student and course', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const testInput: CreateEnrollmentInput = {
      student_id: studentResult[0].id,
      course_id: courseResult[0].id
    };

    const result = await createEnrollment(testInput);

    // Verify the returned enrollment
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.course_id).toEqual(courseResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.enrolled_at).toBeInstanceOf(Date);
  });

  it('should save enrollment to database', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const testInput: CreateEnrollmentInput = {
      student_id: studentResult[0].id,
      course_id: courseResult[0].id
    };

    const result = await createEnrollment(testInput);

    // Query the database to verify the enrollment was saved
    const enrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.id, result.id))
      .execute();

    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].student_id).toEqual(studentResult[0].id);
    expect(enrollments[0].course_id).toEqual(courseResult[0].id);
    expect(enrollments[0].enrolled_at).toBeInstanceOf(Date);
  });

  it('should throw error when student does not exist', async () => {
    // Create a teacher and course, but no student
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const testInput: CreateEnrollmentInput = {
      student_id: 999, // Non-existent student ID
      course_id: courseResult[0].id
    };

    await expect(createEnrollment(testInput)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when course does not exist', async () => {
    // Create a student, but no course
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    const testInput: CreateEnrollmentInput = {
      student_id: studentResult[0].id,
      course_id: 999 // Non-existent course ID
    };

    await expect(createEnrollment(testInput)).rejects.toThrow(/course not found/i);
  });

  it('should throw error when user is not a student', async () => {
    // Create a teacher and course
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Try to enroll the teacher (not a student)
    const testInput: CreateEnrollmentInput = {
      student_id: teacherResult[0].id,
      course_id: courseResult[0].id
    };

    await expect(createEnrollment(testInput)).rejects.toThrow(/user is not a student/i);
  });

  it('should throw error when student is already enrolled in the course', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create an existing enrollment
    await db.insert(enrollmentsTable)
      .values({
        student_id: studentResult[0].id,
        course_id: courseResult[0].id
      })
      .execute();

    const testInput: CreateEnrollmentInput = {
      student_id: studentResult[0].id,
      course_id: courseResult[0].id
    };

    await expect(createEnrollment(testInput)).rejects.toThrow(/already enrolled/i);
  });

  it('should allow different students to enroll in the same course', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const student1Result = await db.insert(usersTable)
      .values({
        email: 'student1@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    const student2Result = await db.insert(usersTable)
      .values({
        email: 'student2@example.com',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'student'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A course for testing',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Enroll first student
    const testInput1: CreateEnrollmentInput = {
      student_id: student1Result[0].id,
      course_id: courseResult[0].id
    };

    const enrollment1 = await createEnrollment(testInput1);

    // Enroll second student in the same course
    const testInput2: CreateEnrollmentInput = {
      student_id: student2Result[0].id,
      course_id: courseResult[0].id
    };

    const enrollment2 = await createEnrollment(testInput2);

    // Both enrollments should be successful
    expect(enrollment1.student_id).toEqual(student1Result[0].id);
    expect(enrollment1.course_id).toEqual(courseResult[0].id);
    expect(enrollment2.student_id).toEqual(student2Result[0].id);
    expect(enrollment2.course_id).toEqual(courseResult[0].id);

    // Verify both enrollments exist in database
    const allEnrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.course_id, courseResult[0].id))
      .execute();

    expect(allEnrollments).toHaveLength(2);
  });
});