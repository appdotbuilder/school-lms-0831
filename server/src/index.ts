import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  getUsersInputSchema,
  updateUserInputSchema,
  deleteUserInputSchema,
  createCourseInputSchema,
  getCoursesByTeacherInputSchema,
  getCoursesByStudentInputSchema,
  updateCourseInputSchema,
  deleteCourseInputSchema,
  createEnrollmentInputSchema,
  getCourseStudentsInputSchema,
  createCourseMaterialInputSchema,
  getCourseMaterialsInputSchema,
  updateCourseMaterialInputSchema,
  deleteCourseMaterialInputSchema,
  createAssignmentInputSchema,
  getAssignmentsInputSchema,
  updateAssignmentInputSchema,
  deleteAssignmentInputSchema,
  createAssignmentSubmissionInputSchema,
  getSubmissionsInputSchema,
  getStudentSubmissionsInputSchema,
  gradeSubmissionInputSchema,
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { deleteUser } from './handlers/delete_user';
import { createCourse } from './handlers/create_course';
import { getCourses } from './handlers/get_courses';
import { getCoursesByTeacher } from './handlers/get_courses_by_teacher';
import { getCoursesByStudent } from './handlers/get_courses_by_student';
import { updateCourse } from './handlers/update_course';
import { deleteCourse } from './handlers/delete_course';
import { createEnrollment } from './handlers/create_enrollment';
import { getCourseStudents } from './handlers/get_course_students';
import { createCourseMaterial } from './handlers/create_course_material';
import { getCourseMaterials } from './handlers/get_course_materials';
import { updateCourseMaterial } from './handlers/update_course_material';
import { deleteCourseMaterial } from './handlers/delete_course_material';
import { createAssignment } from './handlers/create_assignment';
import { getAssignments } from './handlers/get_assignments';
import { updateAssignment } from './handlers/update_assignment';
import { deleteAssignment } from './handlers/delete_assignment';
import { createAssignmentSubmission } from './handlers/create_assignment_submission';
import { getSubmissions } from './handlers/get_submissions';
import { getStudentSubmissions } from './handlers/get_student_submissions';
import { gradeSubmission } from './handlers/grade_submission';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes (primarily for administrators)
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  getUsers: publicProcedure
    .input(getUsersInputSchema)
    .query(({ input }) => getUsers(input)),
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  deleteUser: publicProcedure
    .input(deleteUserInputSchema)
    .mutation(({ input }) => deleteUser(input)),

  // Course management routes
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),
  getCourses: publicProcedure
    .query(() => getCourses()),
  getCoursesByTeacher: publicProcedure
    .input(getCoursesByTeacherInputSchema)
    .query(({ input }) => getCoursesByTeacher(input)),
  getCoursesByStudent: publicProcedure
    .input(getCoursesByStudentInputSchema)
    .query(({ input }) => getCoursesByStudent(input)),
  updateCourse: publicProcedure
    .input(updateCourseInputSchema)
    .mutation(({ input }) => updateCourse(input)),
  deleteCourse: publicProcedure
    .input(deleteCourseInputSchema)
    .mutation(({ input }) => deleteCourse(input)),

  // Enrollment management routes
  createEnrollment: publicProcedure
    .input(createEnrollmentInputSchema)
    .mutation(({ input }) => createEnrollment(input)),
  getCourseStudents: publicProcedure
    .input(getCourseStudentsInputSchema)
    .query(({ input }) => getCourseStudents(input)),

  // Course materials routes
  createCourseMaterial: publicProcedure
    .input(createCourseMaterialInputSchema)
    .mutation(({ input }) => createCourseMaterial(input)),
  getCourseMaterials: publicProcedure
    .input(getCourseMaterialsInputSchema)
    .query(({ input }) => getCourseMaterials(input)),
  updateCourseMaterial: publicProcedure
    .input(updateCourseMaterialInputSchema)
    .mutation(({ input }) => updateCourseMaterial(input)),
  deleteCourseMaterial: publicProcedure
    .input(deleteCourseMaterialInputSchema)
    .mutation(({ input }) => deleteCourseMaterial(input)),

  // Assignment management routes
  createAssignment: publicProcedure
    .input(createAssignmentInputSchema)
    .mutation(({ input }) => createAssignment(input)),
  getAssignments: publicProcedure
    .input(getAssignmentsInputSchema)
    .query(({ input }) => getAssignments(input)),
  updateAssignment: publicProcedure
    .input(updateAssignmentInputSchema)
    .mutation(({ input }) => updateAssignment(input)),
  deleteAssignment: publicProcedure
    .input(deleteAssignmentInputSchema)
    .mutation(({ input }) => deleteAssignment(input)),

  // Assignment submission routes
  createAssignmentSubmission: publicProcedure
    .input(createAssignmentSubmissionInputSchema)
    .mutation(({ input }) => createAssignmentSubmission(input)),
  getSubmissions: publicProcedure
    .input(getSubmissionsInputSchema)
    .query(({ input }) => getSubmissions(input)),
  getStudentSubmissions: publicProcedure
    .input(getStudentSubmissionsInputSchema)
    .query(({ input }) => getStudentSubmissions(input)),
  gradeSubmission: publicProcedure
    .input(gradeSubmissionInputSchema)
    .mutation(({ input }) => gradeSubmission(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`LMS TRPC server listening at port: ${port}`);
}

start();