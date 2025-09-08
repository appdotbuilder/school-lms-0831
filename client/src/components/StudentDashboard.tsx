import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  User, 
  Course, 
  CourseMaterial, 
  Assignment, 
  AssignmentSubmission,
  CreateAssignmentSubmissionInput
} from '../../../server/src/schema';

interface StudentDashboardProps {
  user: User;
}

export function StudentDashboard({ user }: StudentDashboardProps) {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseMaterials, setCourseMaterials] = useState<CourseMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionDialog, setSubmissionDialog] = useState<{open: boolean; assignment: Assignment | null}>({
    open: false,
    assignment: null
  });
  const [submissionForm, setSubmissionForm] = useState<CreateAssignmentSubmissionInput>({
    assignment_id: 0,
    student_id: user.id,
    content: null,
    file_url: null
  });

  const loadAllCourses = useCallback(async () => {
    try {
      const result = await trpc.getCourses.query();
      setAllCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  const loadEnrolledCourses = useCallback(async () => {
    try {
      const result = await trpc.getCoursesByStudent.query({ student_id: user.id });
      setEnrolledCourses(result);
    } catch (error) {
      console.error('Failed to load enrolled courses:', error);
    }
  }, [user.id]);

  const loadSubmissions = useCallback(async () => {
    try {
      const result = await trpc.getStudentSubmissions.query({ student_id: user.id });
      setSubmissions(result);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  }, [user.id]);

  const loadCourseData = useCallback(async (course: Course) => {
    try {
      const [materialsResult, assignmentsResult] = await Promise.all([
        trpc.getCourseMaterials.query({ course_id: course.id }),
        trpc.getAssignments.query({ course_id: course.id })
      ]);
      setCourseMaterials(materialsResult);
      setAssignments(assignmentsResult);
      setSelectedCourse(course);
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  }, []);

  useEffect(() => {
    loadAllCourses();
    loadEnrolledCourses();
    loadSubmissions();
  }, [loadAllCourses, loadEnrolledCourses, loadSubmissions]);

  const handleEnroll = async (courseId: number) => {
    setIsEnrolling(true);
    try {
      await trpc.createEnrollment.mutate({ student_id: user.id, course_id: courseId });
      await loadEnrolledCourses();
    } catch (error) {
      console.error('Failed to enroll:', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await trpc.createAssignmentSubmission.mutate(submissionForm);
      setSubmissionDialog({ open: false, assignment: null });
      setSubmissionForm({
        assignment_id: 0,
        student_id: user.id,
        content: null,
        file_url: null
      });
      await loadSubmissions();
    } catch (error) {
      console.error('Failed to submit assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSubmissionDialog = (assignment: Assignment) => {
    setSubmissionForm({
      assignment_id: assignment.id,
      student_id: user.id,
      content: null,
      file_url: null
    });
    setSubmissionDialog({ open: true, assignment });
  };

  const isEnrolledInCourse = (courseId: number) => {
    return enrolledCourses.some((course: Course) => course.id === courseId);
  };

  const getSubmissionForAssignment = (assignmentId: number) => {
    return submissions.find((sub: AssignmentSubmission) => sub.assignment_id === assignmentId);
  };

  const getAvailableCourses = () => {
    return allCourses.filter((course: Course) => !isEnrolledInCourse(course.id));
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user.first_name}! 🎓
          </h2>
          <p className="text-blue-100">
            Ready to continue your learning journey today?
          </p>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="courses">📚 My Courses</TabsTrigger>
          <TabsTrigger value="materials">📖 Materials</TabsTrigger>
          <TabsTrigger value="assignments">📝 Assignments</TabsTrigger>
          <TabsTrigger value="grades">📊 Grades</TabsTrigger>
        </TabsList>

        {/* My Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Enrolled Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Enrolled Courses ({enrolledCourses.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrolledCourses.map((course: Course) => (
                  <Card 
                    key={course.id}
                    className={`cursor-pointer transition-all ${
                      selectedCourse?.id === course.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-blue-300'
                    }`}
                    onClick={() => loadCourseData(course)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg">{course.name}</h3>
                      {course.description && (
                        <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Created: {course.created_at.toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {enrolledCourses.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    You're not enrolled in any courses yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Available Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Available Courses ({getAvailableCourses().length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getAvailableCourses().map((course: Course) => (
                  <Card key={course.id} className="border-green-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{course.name}</h3>
                          {course.description && (
                            <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Available
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-gray-500">
                          Created: {course.created_at.toLocaleDateString()}
                        </p>
                        <Button 
                          size="sm"
                          onClick={() => handleEnroll(course.id)}
                          disabled={isEnrolling}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isEnrolling ? 'Enrolling...' : '✅ Enroll'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {getAvailableCourses().length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No additional courses available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          {selectedCourse ? (
            <Card>
              <CardHeader>
                <CardTitle>Materials for {selectedCourse.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {courseMaterials.map((material: CourseMaterial) => (
                  <Card key={material.id} className="border-blue-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{material.title}</h3>
                      {material.content && (
                        <p className="text-gray-600 mt-2">{material.content}</p>
                      )}
                      {material.file_url && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" asChild>
                            <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                              📎 Open File
                            </a>
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Added: {material.created_at.toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {courseMaterials.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No materials available for this course.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600">
                  📚 Select a course from the "My Courses" tab to view materials
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          {selectedCourse ? (
            <Card>
              <CardHeader>
                <CardTitle>Assignments for {selectedCourse.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignments.map((assignment: Assignment) => {
                  const submission = getSubmissionForAssignment(assignment.id);
                  return (
                    <Card key={assignment.id} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{assignment.title}</h3>
                            {assignment.description && (
                              <p className="text-gray-600 mt-1">{assignment.description}</p>
                            )}
                          </div>
                          {submission ? (
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Submitted
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">
                              ⏳ Pending
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3">
                          <div className="text-sm text-gray-500">
                            {assignment.due_date && (
                              <p>Due: {assignment.due_date.toLocaleDateString()}</p>
                            )}
                            <p>Created: {assignment.created_at.toLocaleDateString()}</p>
                          </div>
                          
                          {!submission && (
                            <Button 
                              size="sm"
                              onClick={() => openSubmissionDialog(assignment)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              📝 Submit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {assignments.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No assignments available for this course.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600">
                  📝 Select a course from the "My Courses" tab to view assignments
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Grades 📊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submissions.map((submission: AssignmentSubmission) => {
                const assignment = assignments.find((a: Assignment) => a.id === submission.assignment_id);
                return (
                  <Card key={submission.id} className="border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {assignment ? assignment.title : `Assignment #${submission.assignment_id}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Submitted: {submission.submitted_at.toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          {submission.grade !== null ? (
                            <div>
                              <Badge className="bg-blue-100 text-blue-800 text-lg">
                                {submission.grade}/100
                              </Badge>
                              {submission.graded_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Graded: {submission.graded_at.toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              ⏳ Not Graded Yet
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {submissions.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No submissions yet. Complete some assignments to see your grades!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Submission Dialog */}
      <Dialog 
        open={submissionDialog.open} 
        onOpenChange={(open) => setSubmissionDialog({ open, assignment: submissionDialog.assignment })}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Submit Assignment: {submissionDialog.assignment?.title}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAssignment} className="space-y-4">
            <div>
              <Label htmlFor="content">Your Submission</Label>
              <Textarea
                id="content"
                value={submissionForm.content || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setSubmissionForm((prev: CreateAssignmentSubmissionInput) => ({
                    ...prev,
                    content: e.target.value || null
                  }))
                }
                placeholder="Enter your assignment submission here..."
                rows={6}
                required
              />
            </div>
            <div>
              <Label htmlFor="file_url">File URL (optional)</Label>
              <Input
                id="file_url"
                value={submissionForm.file_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSubmissionForm((prev: CreateAssignmentSubmissionInput) => ({
                    ...prev,
                    file_url: e.target.value || null
                  }))
                }
                placeholder="https://example.com/my-file.pdf"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Submitting...' : '📤 Submit Assignment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}