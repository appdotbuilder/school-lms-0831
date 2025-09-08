import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, enrollmentsTable, assignmentSubmissionsTable, assignmentsTable } from '../db/schema';
import { type DeleteUserInput, type CreateUserInput, type CreateCourseInput } from '../schema';
import { deleteUser } from '../handlers/delete_user';
import { eq } from 'drizzle-orm';

// Test inputs
const studentInput: CreateUserInput = {
  email: 'student@test.com',
  first_name: 'John',
  last_name: 'Student',
  role: 'student'
};

const teacherInput: CreateUserInput = {
  email: 'teacher@test.com',
  first_name: 'Jane',
  last_name: 'Teacher',
  role: 'teacher'
};

const adminInput: CreateUserInput = {
  email: 'admin@test.com',
  first_name: 'Bob',
  last_name: 'Admin',
  role: 'administrator'
};

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a student user', async () => {
    // Create a student user
    const createResult = await db.insert(usersTable)
      .values(studentInput)
      .returning()
      .execute();

    const student = createResult[0];

    // Delete the user
    const deleteInput: DeleteUserInput = { id: student.id };
    const result = await deleteUser(deleteInput);

    expect(result.success).toBe(true);

    // Verify user is deleted from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, student.id))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should delete a student with enrollments and submissions', async () => {
    // Create a teacher first
    const teacherResult = await db.insert(usersTable)
      .values(teacherInput)
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create a course
    const courseInput: CreateCourseInput = {
      name: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    };

    const courseResult = await db.insert(coursesTable)
      .values(courseInput)
      .returning()
      .execute();

    const course = courseResult[0];

    // Create a student
    const studentResult = await db.insert(usersTable)
      .values(studentInput)
      .returning()
      .execute();

    const student = studentResult[0];

    // Create an enrollment
    await db.insert(enrollmentsTable)
      .values({
        student_id: student.id,
        course_id: course.id
      })
      .execute();

    // Create an assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date()
      })
      .returning()
      .execute();

    const assignment = assignmentResult[0];

    // Create a submission
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        content: 'Student submission',
        file_url: null
      })
      .execute();

    // Delete the student
    const deleteInput: DeleteUserInput = { id: student.id };
    const result = await deleteUser(deleteInput);

    expect(result.success).toBe(true);

    // Verify user is deleted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, student.id))
      .execute();

    expect(users).toHaveLength(0);

    // Verify enrollments are deleted
    const enrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.student_id, student.id))
      .execute();

    expect(enrollments).toHaveLength(0);

    // Verify submissions are deleted
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.student_id, student.id))
      .execute();

    expect(submissions).toHaveLength(0);
  });

  it('should delete a teacher without courses', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values(teacherInput)
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Delete the teacher
    const deleteInput: DeleteUserInput = { id: teacher.id };
    const result = await deleteUser(deleteInput);

    expect(result.success).toBe(true);

    // Verify user is deleted from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, teacher.id))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should delete an administrator', async () => {
    // Create an admin
    const adminResult = await db.insert(usersTable)
      .values(adminInput)
      .returning()
      .execute();

    const admin = adminResult[0];

    // Delete the admin
    const deleteInput: DeleteUserInput = { id: admin.id };
    const result = await deleteUser(deleteInput);

    expect(result.success).toBe(true);

    // Verify user is deleted from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, admin.id))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should throw error when user not found', async () => {
    const deleteInput: DeleteUserInput = { id: 999 };

    await expect(deleteUser(deleteInput))
      .rejects.toThrow(/user with id 999 not found/i);
  });

  it('should prevent deletion of teacher with active courses', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values(teacherInput)
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create a course for the teacher
    const courseInput: CreateCourseInput = {
      name: 'Active Course',
      description: 'A course that prevents teacher deletion',
      teacher_id: teacher.id
    };

    await db.insert(coursesTable)
      .values(courseInput)
      .execute();

    // Try to delete the teacher
    const deleteInput: DeleteUserInput = { id: teacher.id };

    await expect(deleteUser(deleteInput))
      .rejects.toThrow(/cannot delete teacher: user has 1 active courses/i);

    // Verify teacher still exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, teacher.id))
      .execute();

    expect(users).toHaveLength(1);
  });

  it('should prevent deletion of teacher with multiple courses', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values(teacherInput)
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create multiple courses for the teacher
    const course1: CreateCourseInput = {
      name: 'Course 1',
      description: 'First course',
      teacher_id: teacher.id
    };

    const course2: CreateCourseInput = {
      name: 'Course 2',
      description: 'Second course',
      teacher_id: teacher.id
    };

    await db.insert(coursesTable)
      .values([course1, course2])
      .execute();

    // Try to delete the teacher
    const deleteInput: DeleteUserInput = { id: teacher.id };

    await expect(deleteUser(deleteInput))
      .rejects.toThrow(/cannot delete teacher: user has 2 active courses/i);

    // Verify teacher still exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, teacher.id))
      .execute();

    expect(users).toHaveLength(1);
  });
});