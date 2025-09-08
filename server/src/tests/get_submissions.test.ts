import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type GetSubmissionsInput } from '../schema';
import { getSubmissions } from '../handlers/get_submissions';

describe('getSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return submissions for a specific assignment', async () => {
    // Create prerequisite data
    // Create teacher
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create students
    const [student1] = await db.insert(usersTable)
      .values({
        email: 'student1@example.com',
        first_name: 'Alice',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [student2] = await db.insert(usersTable)
      .values({
        email: 'student2@example.com',
        first_name: 'Bob',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    // Create course
    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    // Create assignment
    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment'
      })
      .returning()
      .execute();

    // Create submissions
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment.id,
          student_id: student1.id,
          content: 'Student 1 submission',
          grade: 85.5
        },
        {
          assignment_id: assignment.id,
          student_id: student2.id,
          content: 'Student 2 submission',
          file_url: 'https://example.com/file.pdf',
          grade: 92.0
        }
      ])
      .execute();

    const input: GetSubmissionsInput = {
      assignment_id: assignment.id
    };

    const result = await getSubmissions(input);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Check first submission
    const submission1 = result.find(s => s.student_id === student1.id);
    expect(submission1).toBeDefined();
    expect(submission1!.assignment_id).toEqual(assignment.id);
    expect(submission1!.content).toEqual('Student 1 submission');
    expect(submission1!.grade).toEqual(85.5);
    expect(typeof submission1!.grade).toBe('number');
    expect(submission1!.submitted_at).toBeInstanceOf(Date);

    // Check second submission
    const submission2 = result.find(s => s.student_id === student2.id);
    expect(submission2).toBeDefined();
    expect(submission2!.assignment_id).toEqual(assignment.id);
    expect(submission2!.content).toEqual('Student 2 submission');
    expect(submission2!.file_url).toEqual('https://example.com/file.pdf');
    expect(submission2!.grade).toEqual(92.0);
    expect(typeof submission2!.grade).toBe('number');
    expect(submission2!.submitted_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no submissions exist for assignment', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment'
      })
      .returning()
      .execute();

    const input: GetSubmissionsInput = {
      assignment_id: assignment.id
    };

    const result = await getSubmissions(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle submissions with null grades correctly', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        first_name: 'Alice',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment'
      })
      .returning()
      .execute();

    // Create submission without grade (ungraded)
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        content: 'Ungraded submission'
      })
      .execute();

    const input: GetSubmissionsInput = {
      assignment_id: assignment.id
    };

    const result = await getSubmissions(input);

    expect(result).toHaveLength(1);
    expect(result[0].assignment_id).toEqual(assignment.id);
    expect(result[0].student_id).toEqual(student.id);
    expect(result[0].content).toEqual('Ungraded submission');
    expect(result[0].grade).toBeNull();
    expect(result[0].graded_at).toBeNull();
    expect(result[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should handle submissions with different content types', async () => {
    // Create prerequisite data
    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        first_name: 'Alice',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Test Assignment',
        description: 'A test assignment'
      })
      .returning()
      .execute();

    // Create submission with only file URL (no content)
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        file_url: 'https://example.com/document.pdf'
      })
      .execute();

    const input: GetSubmissionsInput = {
      assignment_id: assignment.id
    };

    const result = await getSubmissions(input);

    expect(result).toHaveLength(1);
    expect(result[0].assignment_id).toEqual(assignment.id);
    expect(result[0].student_id).toEqual(student.id);
    expect(result[0].content).toBeNull();
    expect(result[0].file_url).toEqual('https://example.com/document.pdf');
    expect(result[0].submitted_at).toBeInstanceOf(Date);
  });
});