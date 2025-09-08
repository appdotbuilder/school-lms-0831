import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import type { User, UserRole, CreateUserInput } from '../../../server/src/schema';

interface UserSelectorProps {
  users: User[];
  onUserSelect: (user: User) => void;
  onUsersUpdate: () => void;
}

export function UserSelector({ users, onUserSelect, onUsersUpdate }: UserSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'student'
  });

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await trpc.createUser.mutate(formData);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'student'
      });
      setIsCreateDialogOpen(false);
      onUsersUpdate();
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {} as Record<UserRole, User[]>);

  return (
    <div className="space-y-6">
      {/* Create New User Button */}
      <div className="text-center">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
              ➕ Create New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role || 'student'}
                  onValueChange={(value: UserRole) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">🎓 Student</SelectItem>
                    <SelectItem value="teacher">👨‍🏫 Teacher</SelectItem>
                    <SelectItem value="administrator">⚙️ Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating ? 'Creating...' : 'Create User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Selection by Role */}
      {Object.entries(groupedUsers).map(([role, roleUsers]) => (
        <Card key={role}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRoleIcon(role as UserRole)}
              {role.charAt(0).toUpperCase() + role.slice(1)}s ({roleUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleUsers.map((user: User) => (
                <Card 
                  key={user.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-indigo-300"
                  onClick={() => onUserSelect(user)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleIcon(user.role)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Joined: {user.created_at.toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {roleUsers.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No {role}s found. Create one to get started!
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {users.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-gray-600 mb-4">
              No users found. Create your first user to get started!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}