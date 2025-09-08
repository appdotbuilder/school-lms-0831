import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  enrollmentsTable, 
  courseMaterialsTable, 
  assignmentsTable,
  assignmentSubmissionsTable 
} from '../db/schema';
import { type DeleteCourseInput } from '../schema';
import { deleteCourse } from '../handlers/delete_course';
import { eq } from 'drizzle-orm';

describe('deleteCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a course successfully', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;
    const input: DeleteCourseInput = { id: courseId };

    // Delete the course
    const result = await deleteCourse(input);

    // Verify result
    expect(result.success).toBe(true);

    // Verify course is deleted from database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    expect(courses).toHaveLength(0);
  });

  it('should cascade delete enrollments when deleting course', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create enrollment
    await db.insert(enrollmentsTable)
      .values({
        student_id: studentResult[0].id,
        course_id: courseResult[0].id
      })
      .execute();

    const courseId = courseResult[0].id;
    const input: DeleteCourseInput = { id: courseId };

    // Delete the course
    await deleteCourse(input);

    // Verify enrollments are deleted
    const enrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.course_id, courseId))
      .execute();

    expect(enrollments).toHaveLength(0);
  });

  it('should cascade delete course materials when deleting course', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create course material
    await db.insert(courseMaterialsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Material',
        content: 'Test content',
        file_url: null
      })
      .execute();

    const courseId = courseResult[0].id;
    const input: DeleteCourseInput = { id: courseId };

    // Delete the course
    await deleteCourse(input);

    // Verify course materials are deleted
    const materials = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.course_id, courseId))
      .execute();

    expect(materials).toHaveLength(0);
  });

  it('should cascade delete assignments and submissions when deleting course', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    // Create assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Assignment',
        description: 'Test description',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    // Create assignment submission
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'Test submission',
        file_url: null
      })
      .execute();

    const courseId = courseResult[0].id;
    const assignmentId = assignmentResult[0].id;
    const input: DeleteCourseInput = { id: courseId };

    // Delete the course
    await deleteCourse(input);

    // Verify assignment submissions are deleted
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();

    expect(submissions).toHaveLength(0);

    // Verify assignments are deleted
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, courseId))
      .execute();

    expect(assignments).toHaveLength(0);
  });

  it('should handle deletion of course with multiple related records', async () => {
    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create test students
    const student1Result = await db.insert(usersTable)
      .values({
        email: 'student1@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      })
      .returning()
      .execute();

    const student2Result = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Complex Course',
        description: 'A course with many relations',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create multiple enrollments
    await db.insert(enrollmentsTable)
      .values([
        {
          student_id: student1Result[0].id,
          course_id: courseId
        },
        {
          student_id: student2Result[0].id,
          course_id: courseId
        }
      ])
      .execute();

    // Create multiple course materials
    await db.insert(courseMaterialsTable)
      .values([
        {
          course_id: courseId,
          title: 'Material 1',
          content: 'Content 1',
          file_url: null
        },
        {
          course_id: courseId,
          title: 'Material 2',
          content: 'Content 2',
          file_url: 'https://example.com/file.pdf'
        }
      ])
      .execute();

    // Create multiple assignments
    const assignmentResults = await db.insert(assignmentsTable)
      .values([
        {
          course_id: courseId,
          title: 'Assignment 1',
          description: 'First assignment',
          due_date: new Date('2024-12-15')
        },
        {
          course_id: courseId,
          title: 'Assignment 2',
          description: 'Second assignment',
          due_date: new Date('2024-12-31')
        }
      ])
      .returning()
      .execute();

    // Create multiple submissions
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignmentResults[0].id,
          student_id: student1Result[0].id,
          content: 'Submission 1',
          file_url: null
        },
        {
          assignment_id: assignmentResults[1].id,
          student_id: student2Result[0].id,
          content: 'Submission 2',
          file_url: 'https://example.com/submission.doc'
        }
      ])
      .execute();

    const input: DeleteCourseInput = { id: courseId };

    // Delete the course
    const result = await deleteCourse(input);

    // Verify successful deletion
    expect(result.success).toBe(true);

    // Verify all related data is deleted
    const remainingCourses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();
    expect(remainingCourses).toHaveLength(0);

    const remainingEnrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.course_id, courseId))
      .execute();
    expect(remainingEnrollments).toHaveLength(0);

    const remainingMaterials = await db.select()
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.course_id, courseId))
      .execute();
    expect(remainingMaterials).toHaveLength(0);

    const remainingAssignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, courseId))
      .execute();
    expect(remainingAssignments).toHaveLength(0);

    // Check submissions for both assignments are deleted
    for (const assignment of assignmentResults) {
      const remainingSubmissions = await db.select()
        .from(assignmentSubmissionsTable)
        .where(eq(assignmentSubmissionsTable.assignment_id, assignment.id))
        .execute();
      expect(remainingSubmissions).toHaveLength(0);
    }
  });

  it('should handle deletion of non-existent course gracefully', async () => {
    const input: DeleteCourseInput = { id: 999 }; // Non-existent ID

    // Should not throw error even if course doesn't exist
    const result = await deleteCourse(input);
    expect(result.success).toBe(true);
  });
});