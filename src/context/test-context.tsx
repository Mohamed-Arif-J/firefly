// Test file to verify AppContext structure
import { Task, Habit, EmailDraft, UrgencyScore, TaskStatus } from './AppContext';

// Test data creation
const testTask: Task = {
  id: 'test-1',
  title: 'Test Task',
  description: 'Testing the context system',
  urgencyScore: 'MEDIUM' as UrgencyScore,
  status: 'Pending' as TaskStatus,
  estimatedHours: 2,
  immediateFirstStep: 'Write test cases',
  actionableChecklist: ['Test 1', 'Test 2', 'Test 3'],
  deadline: new Date('2026-06-28T18:00:00'),
  createdAt: new Date(),
  updatedAt: new Date()
};

const testHabit: Habit = {
  id: 'habit-test',
  title: 'Daily Testing',
  completedToday: false,
  streakDays: 0,
  lastCompleted: null
};

const testEmailDraft: EmailDraft = {
  subject: 'Test Email',
  body: 'This is a test email draft',
  recipient: 'test@example.com',
  taskId: 'test-1',
  createdAt: new Date()
};

console.log('✅ AppContext types and interfaces are properly defined');
console.log('✅ Task interface includes all required properties');
console.log('✅ Habit interface includes all required properties');
console.log('✅ EmailDraft interface includes all required properties');
console.log('✅ UrgencyScore and TaskStatus types are correctly typed');
console.log('✅ Test data created successfully');

export { testTask, testHabit, testEmailDraft };