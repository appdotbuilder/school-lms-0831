import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type DeleteAssignmentInput } from '../schema';
import { deleteAssignment } from '../handlers/delete_assignment';
import { eq } from 'drizzle-orm';

describe('deleteAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an assignment successfully', async () => {
    // Create test data
    const [teacher] = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const [course] = await db.insert(coursesTable).values({
      name: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();

    const [assignment] = await db.insert(assignmentsTable).values({
      course_id: course.id,
      title: 'Test Assignment',
      description: 'A test assignment',
      due_date: new Date('2024-12-31')
    }).returning().execute();

    const input: DeleteAssignmentInput = {
      id: assignment.id
    };

    // Delete the assignment
    const result = await deleteAssignment(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify assignment is deleted from database
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment.id))
      .execute();

    expect(assignments).toHaveLength(0);
  });

  it('should return false when deleting non-existent assignment', async () => {
    const input: DeleteAssignmentInput = {
      id: 999999 // Non-existent ID
    };

    const result = await deleteAssignment(input);

    expect(result.success).toBe(false);
  });

  it('should cascade delete related assignment submissions', async () => {
    // Create test data
    const [teacher] = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const [student] = await db.insert(usersTable).values({
      email: 'student@test.com',
      first_name: 'Student',
      last_name: 'User',
      role: 'student'
    }).returning().execute();

    const [course] = await db.insert(coursesTable).values({
      name: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();

    const [assignment] = await db.insert(assignmentsTable).values({
      course_id: course.id,
      title: 'Test Assignment',
      description: 'A test assignment',
      due_date: new Date('2024-12-31')
    }).returning().execute();

    // Create multiple submissions for this assignment
    const [submission1] = await db.insert(assignmentSubmissionsTable).values({
      assignment_id: assignment.id,
      student_id: student.id,
      content: 'First submission',
      file_url: null
    }).returning().execute();

    const [submission2] = await db.insert(assignmentSubmissionsTable).values({
      assignment_id: assignment.id,
      student_id: student.id,
      content: 'Second submission',
      file_url: 'http://example.com/file.pdf'
    }).returning().execute();

    // Verify submissions exist before deletion
    const submissionsBefore = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignment.id))
      .execute();

    expect(submissionsBefore).toHaveLength(2);

    const input: DeleteAssignmentInput = {
      id: assignment.id
    };

    // Delete the assignment
    const result = await deleteAssignment(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify assignment is deleted
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment.id))
      .execute();

    expect(assignments).toHaveLength(0);

    // Verify all related submissions are also deleted
    const submissionsAfter = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignment.id))
      .execute();

    expect(submissionsAfter).toHaveLength(0);

    // Verify that submissions with specific IDs are deleted
    const specificSubmissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submission1.id))
      .execute();

    expect(specificSubmissions).toHaveLength(0);
  });

  it('should only delete specified assignment, not others', async () => {
    // Create test data
    const [teacher] = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const [course] = await db.insert(coursesTable).values({
      name: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();

    // Create two assignments
    const [assignment1] = await db.insert(assignmentsTable).values({
      course_id: course.id,
      title: 'Assignment 1',
      description: 'First assignment',
      due_date: new Date('2024-12-31')
    }).returning().execute();

    const [assignment2] = await db.insert(assignmentsTable).values({
      course_id: course.id,
      title: 'Assignment 2',
      description: 'Second assignment',
      due_date: new Date('2024-12-31')
    }).returning().execute();

    const input: DeleteAssignmentInput = {
      id: assignment1.id
    };

    // Delete only the first assignment
    const result = await deleteAssignment(input);

    expect(result.success).toBe(true);

    // Verify first assignment is deleted
    const deletedAssignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment1.id))
      .execute();

    expect(deletedAssignment).toHaveLength(0);

    // Verify second assignment still exists
    const remainingAssignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment2.id))
      .execute();

    expect(remainingAssignment).toHaveLength(1);
    expect(remainingAssignment[0].title).toEqual('Assignment 2');
  });

  it('should handle assignment with graded submissions correctly', async () => {
    // Create test data
    const [teacher] = await db.insert(usersTable).values({
      email: 'teacher@test.com',
      first_name: 'Teacher',
      last_name: 'User',
      role: 'teacher'
    }).returning().execute();

    const [student] = await db.insert(usersTable).values({
      email: 'student@test.com',
      first_name: 'Student',
      last_name: 'User',
      role: 'student'
    }).returning().execute();

    const [course] = await db.insert(coursesTable).values({
      name: 'Test Course',
      description: 'A test course',
      teacher_id: teacher.id
    }).returning().execute();

    const [assignment] = await db.insert(assignmentsTable).values({
      course_id: course.id,
      title: 'Graded Assignment',
      description: 'An assignment with grades',
      due_date: new Date('2024-12-31')
    }).returning().execute();

    // Create submission with grade
    const [submission] = await db.insert(assignmentSubmissionsTable).values({
      assignment_id: assignment.id,
      student_id: student.id,
      content: 'Graded submission',
      file_url: null,
      grade: 95.5,
      graded_at: new Date()
    }).returning().execute();

    // Verify submission with grade exists
    const gradedSubmissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, submission.id))
      .execute();

    expect(gradedSubmissions).toHaveLength(1);
    expect(gradedSubmissions[0].grade).toEqual(95.5);

    const input: DeleteAssignmentInput = {
      id: assignment.id
    };

    // Delete the assignment
    const result = await deleteAssignment(input);

    expect(result.success).toBe(true);

    // Verify assignment and its graded submission are both deleted
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment.id))
      .execute();

    expect(assignments).toHaveLength(0);

    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignment.id))
      .execute();

    expect(submissions).toHaveLength(0);
  });
});