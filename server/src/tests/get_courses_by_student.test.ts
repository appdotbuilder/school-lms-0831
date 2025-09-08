import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, enrollmentsTable } from '../db/schema';
import { type GetCoursesByStudentInput } from '../schema';
import { getCoursesByStudent } from '../handlers/get_courses_by_student';

// Test data
const testStudent = {
  email: 'student@test.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student' as const
};

const testTeacher = {
  email: 'teacher@test.com',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'teacher' as const
};

const testCourse1 = {
  name: 'Mathematics 101',
  description: 'Introduction to Mathematics',
  teacher_id: 0 // Will be set after teacher creation
};

const testCourse2 = {
  name: 'Physics 101',
  description: 'Introduction to Physics',
  teacher_id: 0 // Will be set after teacher creation
};

const testCourse3 = {
  name: 'Chemistry 101',
  description: 'Introduction to Chemistry',
  teacher_id: 0 // Will be set after teacher creation
};

describe('getCoursesByStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return courses for enrolled student', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();
    const student = studentResult[0];

    // Create courses
    const course1Result = await db.insert(coursesTable)
      .values({ ...testCourse1, teacher_id: teacher.id })
      .returning()
      .execute();
    const course1 = course1Result[0];

    const course2Result = await db.insert(coursesTable)
      .values({ ...testCourse2, teacher_id: teacher.id })
      .returning()
      .execute();
    const course2 = course2Result[0];

    // Create third course but don't enroll student
    await db.insert(coursesTable)
      .values({ ...testCourse3, teacher_id: teacher.id })
      .returning()
      .execute();

    // Enroll student in first two courses
    await db.insert(enrollmentsTable)
      .values({ student_id: student.id, course_id: course1.id })
      .execute();

    await db.insert(enrollmentsTable)
      .values({ student_id: student.id, course_id: course2.id })
      .execute();

    // Test the handler
    const input: GetCoursesByStudentInput = {
      student_id: student.id
    };

    const result = await getCoursesByStudent(input);

    // Should return exactly 2 courses (only enrolled ones)
    expect(result).toHaveLength(2);

    // Check that both enrolled courses are returned
    const courseIds = result.map(c => c.id).sort();
    expect(courseIds).toEqual([course1.id, course2.id].sort());

    // Verify course details
    const mathCourse = result.find(c => c.name === 'Mathematics 101');
    expect(mathCourse).toBeDefined();
    expect(mathCourse!.description).toEqual('Introduction to Mathematics');
    expect(mathCourse!.teacher_id).toEqual(teacher.id);
    expect(mathCourse!.created_at).toBeInstanceOf(Date);
    expect(mathCourse!.updated_at).toBeInstanceOf(Date);

    const physicsCourse = result.find(c => c.name === 'Physics 101');
    expect(physicsCourse).toBeDefined();
    expect(physicsCourse!.description).toEqual('Introduction to Physics');
    expect(physicsCourse!.teacher_id).toEqual(teacher.id);
  });

  it('should return empty array for student with no enrollments', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();
    const student = studentResult[0];

    // Create a course but don't enroll student
    await db.insert(coursesTable)
      .values({ ...testCourse1, teacher_id: teacher.id })
      .returning()
      .execute();

    // Test the handler
    const input: GetCoursesByStudentInput = {
      student_id: student.id
    };

    const result = await getCoursesByStudent(input);

    // Should return empty array
    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent student', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create a course
    await db.insert(coursesTable)
      .values({ ...testCourse1, teacher_id: teacher.id })
      .returning()
      .execute();

    // Test with non-existent student ID
    const input: GetCoursesByStudentInput = {
      student_id: 99999
    };

    const result = await getCoursesByStudent(input);

    // Should return empty array for non-existent student
    expect(result).toHaveLength(0);
  });

  it('should handle courses with null description', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();
    const student = studentResult[0];

    // Create course with null description
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Course with null description',
        description: null,
        teacher_id: teacher.id
      })
      .returning()
      .execute();
    const course = courseResult[0];

    // Enroll student
    await db.insert(enrollmentsTable)
      .values({ student_id: student.id, course_id: course.id })
      .execute();

    // Test the handler
    const input: GetCoursesByStudentInput = {
      student_id: student.id
    };

    const result = await getCoursesByStudent(input);

    // Should return the course with null description
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Course with null description');
    expect(result[0].description).toBeNull();
    expect(result[0].teacher_id).toEqual(teacher.id);
  });

  it('should return multiple courses in correct order', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    const teacher = teacherResult[0];

    // Create student
    const studentResult = await db.insert(usersTable)
      .values(testStudent)
      .returning()
      .execute();
    const student = studentResult[0];

    // Create multiple courses
    const courses = [];
    for (let i = 1; i <= 5; i++) {
      const courseResult = await db.insert(coursesTable)
        .values({
          name: `Course ${i}`,
          description: `Description for course ${i}`,
          teacher_id: teacher.id
        })
        .returning()
        .execute();
      courses.push(courseResult[0]);
    }

    // Enroll student in all courses
    for (const course of courses) {
      await db.insert(enrollmentsTable)
        .values({ student_id: student.id, course_id: course.id })
        .execute();
    }

    // Test the handler
    const input: GetCoursesByStudentInput = {
      student_id: student.id
    };

    const result = await getCoursesByStudent(input);

    // Should return all 5 courses
    expect(result).toHaveLength(5);

    // Verify all courses are present
    const returnedCourseIds = result.map(c => c.id).sort();
    const expectedCourseIds = courses.map(c => c.id).sort();
    expect(returnedCourseIds).toEqual(expectedCourseIds);

    // Verify course details are correctly returned
    for (let i = 0; i < result.length; i++) {
      const course = result[i];
      expect(course.name).toMatch(/^Course \d$/);
      expect(course.description).toMatch(/^Description for course \d$/);
      expect(course.teacher_id).toEqual(teacher.id);
      expect(course.id).toBeDefined();
      expect(course.created_at).toBeInstanceOf(Date);
      expect(course.updated_at).toBeInstanceOf(Date);
    }
  });
});