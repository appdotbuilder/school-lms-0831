import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type GradeSubmissionInput } from '../schema';
import { gradeSubmission } from '../handlers/grade_submission';
import { eq } from 'drizzle-orm';

describe('gradeSubmission', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should grade an assignment submission successfully', async () => {
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
        name: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Homework 1',
        description: 'Complete exercises 1-10',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'My submission content',
        file_url: null
      })
      .returning()
      .execute();

    const gradeInput: GradeSubmissionInput = {
      id: submissionResult[0].id,
      grade: 85.5
    };

    // Grade the submission
    const result = await gradeSubmission(gradeInput);

    // Verify the result
    expect(result.id).toEqual(submissionResult[0].id);
    expect(result.assignment_id).toEqual(assignmentResult[0].id);
    expect(result.student_id).toEqual(studentResult[0].id);
    expect(result.content).toEqual('My submission content');
    expect(result.file_url).toBeNull();
    expect(result.grade).toEqual(85.5);
    expect(typeof result.grade).toBe('number');
    expect(result.graded_at).toBeInstanceOf(Date);
    expect(result.submitted_at).toBeInstanceOf(Date);
  });

  it('should save grade to database correctly', async () => {
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
        name: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Homework 1',
        description: 'Complete exercises 1-10',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'My submission content',
        file_url: null
      })
      .returning()
      .execute();

    const gradeInput: GradeSubmissionInput = {
      id: submissionResult[0].id,
      grade: 92.0
    };

    // Grade the submission
    await gradeSubmission(gradeInput);

    // Query the database to verify the grade was saved
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submissionResult[0].id))
      .execute();

    expect(submissions).toHaveLength(1);
    const submission = submissions[0];
    expect(parseFloat(submission.grade!.toString())).toEqual(92.0);
    expect(submission.graded_at).toBeInstanceOf(Date);
    expect(submission.graded_at).not.toBeNull();
  });

  it('should handle integer grades correctly', async () => {
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
        name: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Homework 1',
        description: 'Complete exercises 1-10',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'My submission content',
        file_url: null
      })
      .returning()
      .execute();

    const gradeInput: GradeSubmissionInput = {
      id: submissionResult[0].id,
      grade: 100
    };

    // Grade the submission
    const result = await gradeSubmission(gradeInput);

    // Verify integer grade is handled correctly
    expect(result.grade).toEqual(100);
    expect(typeof result.grade).toBe('number');
  });

  it('should throw error when submission does not exist', async () => {
    const gradeInput: GradeSubmissionInput = {
      id: 99999, // Non-existent ID
      grade: 85.0
    };

    // Should throw an error for non-existent submission
    await expect(gradeSubmission(gradeInput)).rejects.toThrow(/not found/i);
  });

  it('should preserve existing submission data when grading', async () => {
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
        name: 'Math 101',
        description: 'Basic Mathematics',
        teacher_id: teacherResult[0].id
      })
      .returning()
      .execute();

    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Homework 1',
        description: 'Complete exercises 1-10',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    const submissionResult = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignmentResult[0].id,
        student_id: studentResult[0].id,
        content: 'Original submission content',
        file_url: 'https://example.com/file.pdf'
      })
      .returning()
      .execute();

    const originalSubmittedAt = submissionResult[0].submitted_at;

    const gradeInput: GradeSubmissionInput = {
      id: submissionResult[0].id,
      grade: 78.5
    };

    // Grade the submission
    const result = await gradeSubmission(gradeInput);

    // Verify existing data is preserved
    expect(result.content).toEqual('Original submission content');
    expect(result.file_url).toEqual('https://example.com/file.pdf');
    expect(result.submitted_at).toEqual(originalSubmittedAt);
    expect(result.assignment_id).toEqual(assignmentResult[0].id);
    expect(result.student_id).toEqual(studentResult[0].id);

    // Verify new grade data
    expect(result.grade).toEqual(78.5);
    expect(result.graded_at).toBeInstanceOf(Date);
    expect(result.graded_at).not.toEqual(originalSubmittedAt);
  });
});