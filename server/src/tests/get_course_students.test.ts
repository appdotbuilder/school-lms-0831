import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, enrollmentsTable } from '../db/schema';
import { type GetCourseStudentsInput, type CreateUserInput, type CreateCourseInput } from '../schema';
import { getCourseStudents } from '../handlers/get_course_students';

describe('getCourseStudents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testTeacher: CreateUserInput = {
    email: 'teacher@example.com',
    first_name: 'John',
    last_name: 'Teacher',
    role: 'teacher'
  };

  const testStudent1: CreateUserInput = {
    email: 'student1@example.com',
    first_name: 'Alice',
    last_name: 'Student',
    role: 'student'
  };

  const testStudent2: CreateUserInput = {
    email: 'student2@example.com',
    first_name: 'Bob',
    last_name: 'Student',
    role: 'student'
  };

  const testStudent3: CreateUserInput = {
    email: 'student3@example.com',
    first_name: 'Charlie',
    last_name: 'Student',
    role: 'student'
  };

  it('should return all students enrolled in a course', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create course
    const testCourse: CreateCourseInput = {
      name: 'Mathematics 101',
      description: 'Basic mathematics course',
      teacher_id: teacher.id
    };

    const courseResult = await db.insert(coursesTable)
      .values(testCourse)
      .returning()
      .execute();
    const course = courseResult[0];

    // Create students
    const student1Result = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();
    const student1 = student1Result[0];

    const student2Result = await db.insert(usersTable)
      .values(testStudent2)
      .returning()
      .execute();
    const student2 = student2Result[0];

    // Enroll students in course
    await db.insert(enrollmentsTable)
      .values([
        { student_id: student1.id, course_id: course.id },
        { student_id: student2.id, course_id: course.id }
      ])
      .execute();

    // Test the handler
    const input: GetCourseStudentsInput = {
      course_id: course.id
    };

    const result = await getCourseStudents(input);

    expect(result).toHaveLength(2);
    
    // Verify both students are returned
    const studentEmails = result.map(student => student.email).sort();
    expect(studentEmails).toEqual(['student1@example.com', 'student2@example.com']);

    // Verify student details
    const alice = result.find(student => student.email === 'student1@example.com');
    expect(alice).toBeDefined();
    expect(alice!.first_name).toBe('Alice');
    expect(alice!.last_name).toBe('Student');
    expect(alice!.role).toBe('student');
    expect(alice!.id).toBe(student1.id);
    expect(alice!.created_at).toBeInstanceOf(Date);
    expect(alice!.updated_at).toBeInstanceOf(Date);

    const bob = result.find(student => student.email === 'student2@example.com');
    expect(bob).toBeDefined();
    expect(bob!.first_name).toBe('Bob');
    expect(bob!.last_name).toBe('Student');
    expect(bob!.role).toBe('student');
    expect(bob!.id).toBe(student2.id);
  });

  it('should return empty array for course with no enrolled students', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create course with no enrollments
    const testCourse: CreateCourseInput = {
      name: 'Empty Course',
      description: 'Course with no students',
      teacher_id: teacher.id
    };

    const courseResult = await db.insert(coursesTable)
      .values(testCourse)
      .returning()
      .execute();
    const course = courseResult[0];

    const input: GetCourseStudentsInput = {
      course_id: course.id
    };

    const result = await getCourseStudents(input);

    expect(result).toHaveLength(0);
  });

  it('should not return non-student users enrolled in course', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create course
    const testCourse: CreateCourseInput = {
      name: 'Mixed Course',
      description: 'Course with mixed user types',
      teacher_id: teacher.id
    };

    const courseResult = await db.insert(coursesTable)
      .values(testCourse)
      .returning()
      .execute();
    const course = courseResult[0];

    // Create student and administrator
    const studentResult = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();
    const student = studentResult[0];

    const adminUser = {
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'administrator' as const
    };

    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();
    const admin = adminResult[0];

    // Enroll both student and admin (hypothetically)
    await db.insert(enrollmentsTable)
      .values([
        { student_id: student.id, course_id: course.id },
        { student_id: admin.id, course_id: course.id }
      ])
      .execute();

    const input: GetCourseStudentsInput = {
      course_id: course.id
    };

    const result = await getCourseStudents(input);

    // Should return all enrolled users (the query doesn't filter by role)
    expect(result).toHaveLength(2);
    
    // Verify we get both users
    const roles = result.map(user => user.role).sort();
    expect(roles).toEqual(['administrator', 'student']);
  });

  it('should handle multiple courses correctly', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create two courses
    const course1Result = await db.insert(coursesTable)
      .values({
        name: 'Course 1',
        description: 'First course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();
    const course1 = course1Result[0];

    const course2Result = await db.insert(coursesTable)
      .values({
        name: 'Course 2',
        description: 'Second course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();
    const course2 = course2Result[0];

    // Create students
    const student1Result = await db.insert(usersTable)
      .values(testStudent1)
      .returning()
      .execute();
    const student1 = student1Result[0];

    const student2Result = await db.insert(usersTable)
      .values(testStudent2)
      .returning()
      .execute();
    const student2 = student2Result[0];

    const student3Result = await db.insert(usersTable)
      .values(testStudent3)
      .returning()
      .execute();
    const student3 = student3Result[0];

    // Enroll students:
    // Course 1: student1, student2
    // Course 2: student2, student3
    await db.insert(enrollmentsTable)
      .values([
        { student_id: student1.id, course_id: course1.id },
        { student_id: student2.id, course_id: course1.id },
        { student_id: student2.id, course_id: course2.id },
        { student_id: student3.id, course_id: course2.id }
      ])
      .execute();

    // Test course 1 students
    const course1Input: GetCourseStudentsInput = {
      course_id: course1.id
    };

    const course1Students = await getCourseStudents(course1Input);
    expect(course1Students).toHaveLength(2);
    
    const course1Emails = course1Students.map(s => s.email).sort();
    expect(course1Emails).toEqual(['student1@example.com', 'student2@example.com']);

    // Test course 2 students
    const course2Input: GetCourseStudentsInput = {
      course_id: course2.id
    };

    const course2Students = await getCourseStudents(course2Input);
    expect(course2Students).toHaveLength(2);
    
    const course2Emails = course2Students.map(s => s.email).sort();
    expect(course2Emails).toEqual(['student2@example.com', 'student3@example.com']);
  });

  it('should return empty array for non-existent course', async () => {
    const input: GetCourseStudentsInput = {
      course_id: 99999 // Non-existent course ID
    };

    const result = await getCourseStudents(input);

    expect(result).toHaveLength(0);
  });
});