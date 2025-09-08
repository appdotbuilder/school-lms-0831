import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type GetStudentSubmissionsInput } from '../schema';
import { getStudentSubmissions } from '../handlers/get_student_submissions';

describe('getStudentSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when student has no submissions', async () => {
    // Create a student user
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const input: GetStudentSubmissionsInput = {
      student_id: student.id
    };

    const result = await getStudentSubmissions(input);

    expect(result).toEqual([]);
  });

  it('should return all submissions for a specific student', async () => {
    // Create test users
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'Test',
        last_name: 'Teacher',
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

    // Create assignments
    const [assignment1] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Assignment 1',
        description: 'First assignment',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    const [assignment2] = await db.insert(assignmentsTable)
      .values({
        course_id: course.id,
        title: 'Assignment 2',
        description: 'Second assignment',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    // Create submissions for the student
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment1.id,
          student_id: student.id,
          content: 'Submission 1 content',
          file_url: 'https://example.com/file1.pdf',
          grade: 85.5,
          graded_at: new Date()
        },
        {
          assignment_id: assignment2.id,
          student_id: student.id,
          content: 'Submission 2 content',
          file_url: null,
          grade: null,
          graded_at: null
        }
      ])
      .execute();

    const input: GetStudentSubmissionsInput = {
      student_id: student.id
    };

    const result = await getStudentSubmissions(input);

    expect(result).toHaveLength(2);
    
    // Check first submission
    const submission1 = result.find(s => s.assignment_id === assignment1.id);
    expect(submission1).toBeDefined();
    expect(submission1!.content).toBe('Submission 1 content');
    expect(submission1!.file_url).toBe('https://example.com/file1.pdf');
    expect(submission1!.grade).toBe(85.5);
    expect(typeof submission1!.grade).toBe('number');
    expect(submission1!.graded_at).toBeInstanceOf(Date);
    expect(submission1!.submitted_at).toBeInstanceOf(Date);
    
    // Check second submission (ungraded)
    const submission2 = result.find(s => s.assignment_id === assignment2.id);
    expect(submission2).toBeDefined();
    expect(submission2!.content).toBe('Submission 2 content');
    expect(submission2!.file_url).toBeNull();
    expect(submission2!.grade).toBeNull();
    expect(submission2!.graded_at).toBeNull();
    expect(submission2!.submitted_at).toBeInstanceOf(Date);
  });

  it('should not return submissions from other students', async () => {
    // Create two students
    const [student1] = await db.insert(usersTable)
      .values({
        email: 'student1@test.com',
        first_name: 'Student',
        last_name: 'One',
        role: 'student'
      })
      .returning()
      .execute();

    const [student2] = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        first_name: 'Student',
        last_name: 'Two',
        role: 'student'
      })
      .returning()
      .execute();

    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create a course and assignment
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
        description: 'A test assignment',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    // Create submissions for both students
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment.id,
          student_id: student1.id,
          content: 'Student 1 submission',
          file_url: null
        },
        {
          assignment_id: assignment.id,
          student_id: student2.id,
          content: 'Student 2 submission',
          file_url: null
        }
      ])
      .execute();

    const input: GetStudentSubmissionsInput = {
      student_id: student1.id
    };

    const result = await getStudentSubmissions(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Student 1 submission');
    expect(result[0].student_id).toBe(student1.id);
  });

  it('should handle numeric grade conversion correctly', async () => {
    // Create test data
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [teacher] = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'Test',
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
        description: 'A test assignment',
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    // Create submission with decimal grade
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        content: 'Test submission',
        file_url: null,
        grade: 92.75
      })
      .execute();

    const input: GetStudentSubmissionsInput = {
      student_id: student.id
    };

    const result = await getStudentSubmissions(input);

    expect(result).toHaveLength(1);
    expect(result[0].grade).toBe(92.75);
    expect(typeof result[0].grade).toBe('number');
  });

  it('should handle non-existent student gracefully', async () => {
    const input: GetStudentSubmissionsInput = {
      student_id: 999999 // Non-existent student ID
    };

    const result = await getStudentSubmissions(input);

    expect(result).toEqual([]);
  });
});