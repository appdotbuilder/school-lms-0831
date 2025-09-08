import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable, enrollmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type CreateAssignmentSubmissionInput } from '../schema';
import { createAssignmentSubmission } from '../handlers/create_assignment_submission';
import { eq, and } from 'drizzle-orm';

describe('createAssignmentSubmission', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let studentId: number;
  let courseId: number;
  let assignmentId: number;

  const setupTestData = async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacherResult[0].id;

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
    studentId = studentResult[0].id;

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;

    // Create an assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Test Assignment',
        description: 'A test assignment',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();
    assignmentId = assignmentResult[0].id;

    // Enroll the student in the course
    await db.insert(enrollmentsTable)
      .values({
        student_id: studentId,
        course_id: courseId
      })
      .execute();
  };

  const testInput: CreateAssignmentSubmissionInput = {
    assignment_id: 0, // Will be set in tests
    student_id: 0,    // Will be set in tests
    content: 'This is my submission content',
    file_url: 'https://example.com/submission.pdf'
  };

  it('should create an assignment submission successfully', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: studentId
    };

    const result = await createAssignmentSubmission(input);

    // Verify the returned submission
    expect(result.id).toBeDefined();
    expect(result.assignment_id).toEqual(assignmentId);
    expect(result.student_id).toEqual(studentId);
    expect(result.content).toEqual('This is my submission content');
    expect(result.file_url).toEqual('https://example.com/submission.pdf');
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.grade).toBeNull();
    expect(result.graded_at).toBeNull();
  });

  it('should save submission to database', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: studentId
    };

    const result = await createAssignmentSubmission(input);

    // Query the database to verify the submission was saved
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].assignment_id).toEqual(assignmentId);
    expect(submissions[0].student_id).toEqual(studentId);
    expect(submissions[0].content).toEqual('This is my submission content');
    expect(submissions[0].file_url).toEqual('https://example.com/submission.pdf');
    expect(submissions[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should handle null content and file_url', async () => {
    await setupTestData();

    const input: CreateAssignmentSubmissionInput = {
      assignment_id: assignmentId,
      student_id: studentId,
      content: null,
      file_url: null
    };

    const result = await createAssignmentSubmission(input);

    expect(result.content).toBeNull();
    expect(result.file_url).toBeNull();
    expect(result.assignment_id).toEqual(assignmentId);
    expect(result.student_id).toEqual(studentId);
  });

  it('should throw error when assignment does not exist', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      assignment_id: 99999, // Non-existent assignment ID
      student_id: studentId
    };

    expect(createAssignmentSubmission(input)).rejects.toThrow(/assignment not found/i);
  });

  it('should throw error when student does not exist', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: 99999 // Non-existent student ID
    };

    expect(createAssignmentSubmission(input)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when user is not a student', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: teacherId // Teacher ID instead of student ID
    };

    expect(createAssignmentSubmission(input)).rejects.toThrow(/user is not a student/i);
  });

  it('should throw error when student is not enrolled in the course', async () => {
    await setupTestData();

    // Create another student who is not enrolled
    const unenrolledStudentResult = await db.insert(usersTable)
      .values({
        email: 'unenrolled@example.com',
        first_name: 'Bob',
        last_name: 'Wilson',
        role: 'student'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: unenrolledStudentResult[0].id
    };

    expect(createAssignmentSubmission(input)).rejects.toThrow(/not enrolled in the course/i);
  });

  it('should throw error when student has already submitted', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: studentId
    };

    // Create the first submission
    await createAssignmentSubmission(input);

    // Try to create a duplicate submission
    const duplicateInput = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: studentId,
      content: 'Different content'
    };

    expect(createAssignmentSubmission(duplicateInput)).rejects.toThrow(/already submitted/i);
  });

  it('should allow different students to submit to the same assignment', async () => {
    await setupTestData();

    // Create another student and enroll them
    const secondStudentResult = await db.insert(usersTable)
      .values({
        email: 'student2@example.com',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'student'
      })
      .returning()
      .execute();

    await db.insert(enrollmentsTable)
      .values({
        student_id: secondStudentResult[0].id,
        course_id: courseId
      })
      .execute();

    // First student submits
    const firstInput = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: studentId
    };
    const firstSubmission = await createAssignmentSubmission(firstInput);

    // Second student submits
    const secondInput = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: secondStudentResult[0].id,
      content: 'Second student content'
    };
    const secondSubmission = await createAssignmentSubmission(secondInput);

    expect(firstSubmission.id).not.toEqual(secondSubmission.id);
    expect(firstSubmission.student_id).toEqual(studentId);
    expect(secondSubmission.student_id).toEqual(secondStudentResult[0].id);
    expect(secondSubmission.content).toEqual('Second student content');
  });

  it('should allow same student to submit to different assignments', async () => {
    await setupTestData();

    // Create another assignment
    const secondAssignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseId,
        title: 'Second Assignment',
        description: 'Another test assignment'
      })
      .returning()
      .execute();

    // Submit to first assignment
    const firstInput = {
      ...testInput,
      assignment_id: assignmentId,
      student_id: studentId
    };
    const firstSubmission = await createAssignmentSubmission(firstInput);

    // Submit to second assignment
    const secondInput = {
      ...testInput,
      assignment_id: secondAssignmentResult[0].id,
      student_id: studentId,
      content: 'Second assignment content'
    };
    const secondSubmission = await createAssignmentSubmission(secondInput);

    expect(firstSubmission.id).not.toEqual(secondSubmission.id);
    expect(firstSubmission.assignment_id).toEqual(assignmentId);
    expect(secondSubmission.assignment_id).toEqual(secondAssignmentResult[0].id);
    expect(secondSubmission.content).toEqual('Second assignment content');
  });
});