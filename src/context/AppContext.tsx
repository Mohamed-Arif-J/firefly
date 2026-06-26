'use client';

import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabaseClient';

// ====================
// Type Definitions
// ====================

export type UrgencyScore = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'Pending' | 'Done' | 'Stuck' | 'Missed';

export interface Task {
  id: string;
  title: string;
  description: string;
  urgencyScore: UrgencyScore;
  status: TaskStatus;
  estimatedHours: number;
  immediateFirstStep: string;
  actionableChecklist: string[];
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Habit {
  id: string;
  title: string;
  completedToday: boolean;
  streakDays: number;
  lastCompleted: Date | null;
}

export interface EmailDraft {
  subject: string;
  body: string;
  recipient: string;
  taskId?: string;
  createdAt: Date;
}

export interface AppState {
  tasks: Task[];
  habits: Habit[];
  activeEmailDraft: EmailDraft | null;
  isRecordingVoice: boolean;
  lastVoiceRecording: {
    text: string;
    timestamp: Date | null;
  };
}

// ====================
// Action Types
// ====================

type Action =
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> & { id: string } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_HABIT'; payload: Habit }
  | { type: 'TOGGLE_HABIT'; payload: string }
  | { type: 'UPDATE_HABIT'; payload: Partial<Habit> & { id: string } }
  | { type: 'SET_ACTIVE_EMAIL_DRAFT'; payload: EmailDraft | null }
  | { type: 'SET_IS_RECORDING_VOICE'; payload: boolean }
  | { type: 'SET_LAST_VOICE_RECORDING'; payload: string }
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_HABITS'; payload: Habit[] };

// ====================
// Initial State
// ====================

const initialState: AppState = {
  tasks: [
    {
      id: 'task-1',
      title: 'Complete Firefly AI prototype',
      description: 'Build the core dashboard and state management for the hackathon submission',
      urgencyScore: 'HIGH',
      status: 'Pending',
      estimatedHours: 8,
      immediateFirstStep: 'Set up React Context and TypeScript interfaces',
      actionableChecklist: [
        'Create AppContext.tsx with proper typing',
        'Implement useApp hook for consumption',
        'Test context provider with sample data',
        'Document state structure in memory file'
      ],
      deadline: new Date('2026-06-29T14:00:00'), // Hackathon deadline
      createdAt: new Date('2026-06-25T10:00:00'),
      updatedAt: new Date('2026-06-25T10:00:00')
    }
  ],
  habits: [
    {
      id: 'habit-1',
      title: 'Morning Deep Work Block',
      completedToday: false,
      streakDays: 5,
      lastCompleted: new Date('2026-06-24T09:00:00')
    },
    {
      id: 'habit-2',
      title: 'Evening Task Review',
      completedToday: true,
      streakDays: 12,
      lastCompleted: new Date('2026-06-25T18:00:00')
    }
  ],
  activeEmailDraft: null,
  isRecordingVoice: false,
  lastVoiceRecording: {
    text: '',
    timestamp: null
  }
};

// ====================
// Reducer
// ====================

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload]
      };

    case 'UPDATE_TASK': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === id
            ? { ...task, ...updates, updatedAt: new Date() }
            : task
        )
      };
    }

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };

    case 'ADD_HABIT':
      return {
        ...state,
        habits: [...state.habits, action.payload]
      };

    case 'TOGGLE_HABIT':
      return {
        ...state,
        habits: state.habits.map(habit =>
          habit.id === action.payload
            ? {
                ...habit,
                completedToday: !habit.completedToday,
                lastCompleted: !habit.completedToday ? new Date() : habit.lastCompleted,
                streakDays: !habit.completedToday ? habit.streakDays + 1 : habit.streakDays
              }
            : habit
        )
      };

    case 'UPDATE_HABIT': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        habits: state.habits.map(habit =>
          habit.id === id
            ? { ...habit, ...updates }
            : habit
        )
      };
    }

    case 'SET_ACTIVE_EMAIL_DRAFT':
      return {
        ...state,
        activeEmailDraft: action.payload
      };

    case 'SET_IS_RECORDING_VOICE':
      return {
        ...state,
        isRecordingVoice: action.payload
      };

    case 'SET_LAST_VOICE_RECORDING':
      return {
        ...state,
        lastVoiceRecording: {
          text: action.payload,
          timestamp: new Date()
        }
      };

    case 'RESET_STATE':
      return initialState;

    case 'LOAD_STATE':
      return action.payload;

    case 'SET_TASKS':
      return {
        ...state,
        tasks: action.payload
      };

    case 'SET_HABITS':
      return {
        ...state,
        habits: action.payload
      };

    default:
      return state;
  }
}

// ====================
// Context Creation
// ====================

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: TaskStatus }) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  markTaskAsMissed: (taskId: string) => void;
  createFirefighterEmail: (task: Task, recipient: string) => void;
  toggleVoiceRecording: () => void;
  clearActiveEmailDraft: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ====================
// Provider Component
// ====================

interface AppProviderProps {
  children: ReactNode;
}

// Helper to get or create a session ID
const getSessionId = () => {
  if (typeof window === 'undefined') return 'server';
  let sessionId = localStorage.getItem('firefly_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('firefly_session_id', sessionId);
  }
  return sessionId;
};

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 1. Fetch saved tasks and habits from Supabase on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const sessionId = getSessionId();
        
        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('session_id', sessionId);
        
        if (tasksError) {
          console.error('Error fetching tasks from Supabase:', tasksError);
        } else if (tasksData && tasksData.length > 0) {
          const parsedTasks: Task[] = tasksData.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            urgencyScore: t.urgency_score as UrgencyScore,
            status: t.status as TaskStatus,
            estimatedHours: Number(t.estimated_hours),
            immediateFirstStep: t.immediate_first_step || '',
            actionableChecklist: t.actionable_checklist || [],
            deadline: t.deadline ? new Date(t.deadline) : null,
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
          }));
          dispatch({ type: 'SET_TASKS', payload: parsedTasks });
        }

        // Fetch habits
        const { data: habitsData, error: habitsError } = await supabase
          .from('habits')
          .select('*')
          .eq('session_id', sessionId);
        
        if (habitsError) {
          console.error('Error fetching habits from Supabase:', habitsError);
        } else if (habitsData && habitsData.length > 0) {
          const parsedHabits: Habit[] = habitsData.map((h: any) => ({
            id: h.id,
            title: h.title,
            completedToday: h.completed_today,
            streakDays: h.streak_days,
            lastCompleted: h.last_completed ? new Date(h.last_completed) : null,
          }));
          dispatch({ type: 'SET_HABITS', payload: parsedHabits });
        }
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Custom dispatch wrapper to sync changes immediately to Supabase
  const customDispatch = useCallback((action: Action) => {
    // Dispatch action to local state first for instant UI response
    dispatch(action);

    const sessionId = getSessionId();

    try {
      switch (action.type) {
        case 'ADD_TASK': {
          const task = action.payload;
          console.log(`💾 Syncing task creation to Supabase: "${task.title}" (Status: ${task.status})`);
          supabase
            .from('tasks')
            .upsert({
              id: task.id,
              session_id: sessionId,
              title: task.title,
              description: task.description,
              urgency_score: task.urgencyScore,
              status: task.status,
              estimated_hours: task.estimatedHours,
              immediate_first_step: task.immediateFirstStep,
              actionable_checklist: task.actionableChecklist,
              deadline: task.deadline ? task.deadline.toISOString() : null,
              created_at: task.createdAt.toISOString(),
              updated_at: task.updatedAt.toISOString(),
            }, {
              onConflict: 'id'
            })
            .then(({ error }) => {
              if (error) console.error(`Error saving task "${task.title}":`, error);
              else console.log(`✅ Task "${task.title}" saved to Supabase.`);
            });
          break;
        }
        case 'UPDATE_TASK': {
          const existingTask = state.tasks.find(t => t.id === action.payload.id);
          if (existingTask) {
            const updated = { ...existingTask, ...action.payload };
            console.log(`💾 Syncing task update to Supabase: "${updated.title}" (Status: ${updated.status})`);
            supabase
              .from('tasks')
              .upsert({
                id: updated.id,
                session_id: sessionId,
                title: updated.title,
                description: updated.description,
                urgency_score: updated.urgencyScore,
                status: updated.status,
                estimated_hours: updated.estimatedHours,
                immediate_first_step: updated.immediateFirstStep,
                actionable_checklist: updated.actionableChecklist,
                deadline: updated.deadline ? updated.deadline.toISOString() : null,
                created_at: updated.createdAt.toISOString(),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'id'
              })
              .then(({ error }) => {
                if (error) console.error(`Error updating task "${updated.title}":`, error);
                else console.log(`✅ Task "${updated.title}" updated in Supabase.`);
              });
          }
          break;
        }
        case 'DELETE_TASK': {
          const taskId = action.payload;
          const existingTask = state.tasks.find(t => t.id === taskId);
          const taskTitle = existingTask ? existingTask.title : taskId;
          console.log(`🗑️ Deleting task from Supabase: "${taskTitle}"`);
          supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('session_id', sessionId)
            .then(({ error }) => {
              if (error) console.error(`Error deleting task "${taskTitle}":`, error);
              else console.log(`✅ Task "${taskTitle}" deleted from Supabase.`);
            });
          break;
        }
        case 'ADD_HABIT': {
          const habit = action.payload;
          console.log(`💾 Syncing habit creation to Supabase: "${habit.title}"`);
          supabase
            .from('habits')
            .upsert({
              id: habit.id,
              session_id: sessionId,
              title: habit.title,
              completed_today: habit.completedToday,
              streak_days: habit.streakDays,
              last_completed: habit.lastCompleted ? habit.lastCompleted.toISOString() : null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
            .then(({ error }) => {
              if (error) console.error(`Error saving habit "${habit.title}":`, error);
              else console.log(`✅ Habit "${habit.title}" saved to Supabase.`);
            });
          break;
        }
        case 'TOGGLE_HABIT': {
          const habitId = action.payload;
          const habit = state.habits.find(h => h.id === habitId);
          if (habit) {
            const nextCompletedToday = !habit.completedToday;
            const nextStreak = nextCompletedToday ? habit.streakDays + 1 : Math.max(0, habit.streakDays - 1);
            const nextLastCompleted = nextCompletedToday ? new Date() : habit.lastCompleted;
            
            console.log(`💾 Syncing habit toggle to Supabase: "${habit.title}" (Completed: ${nextCompletedToday})`);
            supabase
              .from('habits')
              .upsert({
                id: habit.id,
                session_id: sessionId,
                title: habit.title,
                completed_today: nextCompletedToday,
                streak_days: nextStreak,
                last_completed: nextLastCompleted ? nextLastCompleted.toISOString() : null,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              })
              .then(({ error }) => {
                if (error) console.error(`Error toggling habit "${habit.title}":`, error);
                else console.log(`✅ Habit "${habit.title}" toggled in Supabase.`);
              });
          }
          break;
        }
        case 'UPDATE_HABIT': {
          const existingHabit = state.habits.find(h => h.id === action.payload.id);
          if (existingHabit) {
            const updated = { ...existingHabit, ...action.payload };
            console.log(`💾 Syncing habit update to Supabase: "${updated.title}"`);
            supabase
              .from('habits')
              .upsert({
                id: updated.id,
                session_id: sessionId,
                title: updated.title,
                completed_today: updated.completedToday,
                streak_days: updated.streakDays,
                last_completed: updated.lastCompleted ? updated.lastCompleted.toISOString() : null,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              })
              .then(({ error }) => {
                if (error) console.error(`Error updating habit "${updated.title}":`, error);
                else console.log(`✅ Habit "${updated.title}" updated in Supabase.`);
              });
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error('Failed to sync to Supabase in customDispatch:', err);
    }
  }, [dispatch, state.tasks, state.habits]);

  // Convenience actions
  const contextValue = useMemo(() => ({
    state,
    dispatch: customDispatch,
    addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: TaskStatus }) => {
      const newTask: Task = {
        status: 'Pending',
        ...taskData,
        id: `task-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      customDispatch({ type: 'ADD_TASK', payload: newTask });
    },
    updateTaskStatus: (taskId: string, status: TaskStatus) => {
      customDispatch({ type: 'UPDATE_TASK', payload: { id: taskId, status } });
    },
    markTaskAsMissed: (taskId: string) => {
      const task = state.tasks.find(t => t.id === taskId);
      if (task && task.deadline && new Date() > task.deadline) {
        customDispatch({ type: 'UPDATE_TASK', payload: { id: taskId, status: 'Missed' } });
        
        // Auto-create firefighter email draft for missed tasks
        const emailDraft: EmailDraft = {
          subject: `Extension Request: ${task.title}`,
          body: `Dear ${task.title.includes('client') ? 'Client' : 'Team'},

I'm writing to request a brief extension on the "${task.title}" task. We're making good progress but need a bit more time to ensure quality delivery.

Current status: ${task.description}
Estimated additional time needed: ${Math.ceil(task.estimatedHours * 0.25)} hours

Please let me know if this works for your schedule.

Best regards,
Firefly AI User`,
          recipient: task.title.includes('client') ? 'client@example.com' : 'team@example.com',
          taskId,
          createdAt: new Date()
        };
        customDispatch({ type: 'SET_ACTIVE_EMAIL_DRAFT', payload: emailDraft });
      }
    },
    createFirefighterEmail: (task: Task, recipient: string) => {
      const urgencyMap = {
        'HIGH': 'urgent',
        'MEDIUM': 'important',
        'LOW': 'ongoing'
      };
      
      const emailDraft: EmailDraft = {
        subject: `Update on ${task.title} (${urgencyMap[task.urgencyScore]} priority)`,
        body: `Hello,

This is an automated update from Firefly AI regarding the task: "${task.title}"

Current Status: ${task.status}
Urgency: ${task.urgencyScore}
Deadline: ${task.deadline?.toLocaleDateString() || 'Not set'}

${task.status === 'Stuck' 
  ? `I'm currently stuck on: ${task.immediateFirstStep}\n\nCould we schedule a brief sync to unblock this?`
  : task.status === 'Missed'
  ? `I've missed the deadline for this task. Could we discuss a new timeline?`
  : `Progress is on track. Next step: ${task.immediateFirstStep}`
}

Actionable Checklist:
${task.actionableChecklist.map(item => `• ${item}`).join('\n')}

Best,
Firefly AI`,
        recipient,
        taskId: task.id,
        createdAt: new Date()
      };
      customDispatch({ type: 'SET_ACTIVE_EMAIL_DRAFT', payload: emailDraft });
    },
    toggleVoiceRecording: () => {
      const newRecordingState = !state.isRecordingVoice;
      customDispatch({ type: 'SET_IS_RECORDING_VOICE', payload: newRecordingState });
      
      if (!newRecordingState) {
        // When stopping recording, simulate voice-to-text processing
        // In real app, this would come from Web Speech API
        customDispatch({ type: 'SET_LAST_VOICE_RECORDING', payload: 'Voice note processed: "Add task for tomorrow\'s meeting"' });
      }
    },
    clearActiveEmailDraft: () => {
      customDispatch({ type: 'SET_ACTIVE_EMAIL_DRAFT', payload: null });
    }
  }), [state, customDispatch]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// ====================
// Custom Hook
// ====================

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ====================
// Utility Functions
// ====================

export function getTasksByUrgency(tasks: Task[], urgency: UrgencyScore): Task[] {
  return tasks.filter(task => task.urgencyScore === urgency);
}

export function getMissedTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks.filter(task => 
    task.status === 'Missed' || 
    (task.deadline && task.deadline < now && task.status !== 'Done')
  );
}

export function calculateProductivityScore(tasks: Task[], habits: Habit[]): number {
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const totalTasks = tasks.length;
  const completedHabits = habits.filter(h => h.completedToday).length;
  const totalHabits = habits.length;
  
  if (totalTasks === 0 && totalHabits === 0) return 100;
  
  const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  const habitScore = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 100;
  
  return Math.round((taskScore * 0.7) + (habitScore * 0.3));
}