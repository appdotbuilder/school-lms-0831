import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../../server/src/schema';

// Import role-based components
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { UserSelector } from './components/UserSelector';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getUsers.query({});
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'student':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'teacher':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'administrator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'student':
        return '🎓';
      case 'teacher':
        return '👨‍🏫';
      case 'administrator':
        return '⚙️';
      default:
        return '👤';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-600">Loading LMS...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🏫 Learning Management System
            </h1>
            <p className="text-xl text-gray-600">
              Welcome to our educational platform
            </p>
          </div>

          {/* User Selection */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Select User to Continue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserSelector 
                users={users} 
                onUserSelect={setCurrentUser}
                onUsersUpdate={loadUsers}
              />
            </CardContent>
          </Card>

          {/* Role Overview */}
          <div className="grid md:grid-cols-3 gap-6 mt-8 max-w-6xl mx-auto">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  🎓 Student Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-700">
                <ul className="space-y-2">
                  <li>• View and enroll in courses</li>
                  <li>• Access course materials</li>
                  <li>• Submit assignments</li>
                  <li>• View grades</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  👨‍🏫 Teacher Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-green-700">
                <ul className="space-y-2">
                  <li>• Create and manage courses</li>
                  <li>• Upload learning materials</li>
                  <li>• Create assignments</li>
                  <li>• Grade submissions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  ⚙️ Administrator Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-purple-700">
                <ul className="space-y-2">
                  <li>• Manage users</li>
                  <li>• Oversee all courses</li>
                  <li>• System administration</li>
                  <li>• Monitor activities</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">
                🏫 LMS Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium text-gray-800">
                  {currentUser.first_name} {currentUser.last_name}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-sm">{getRoleIcon(currentUser.role)}</span>
                  <Badge className={getRoleColor(currentUser.role)}>
                    {currentUser.role}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setCurrentUser(null)}
                className="ml-4"
              >
                Switch User
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {currentUser.role === 'student' && (
          <StudentDashboard user={currentUser} />
        )}
        {currentUser.role === 'teacher' && (
          <TeacherDashboard user={currentUser} />
        )}
        {currentUser.role === 'administrator' && (
          <AdminDashboard user={currentUser} />
        )}
      </main>
    </div>
  );
}

export default App;