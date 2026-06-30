'use client';

import { AppProvider, useApp } from '@/src/context/AppContext';
import { Task, TaskStatus, UrgencyScore } from '@/src/context/AppContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import FirefliesBackground from '../components/FirefliesBackground';

// ========================================
// Stats Tile Component
// ========================================
interface StatsTileProps {
  label: string;
  value: string | number;
  description?: string;
}

function StatsTile({ label, value, description }: StatsTileProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">{label}</p>
        <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
      </div>
      {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
    </div>
  );
}

// ========================================
// Account / Settings Sub-component
// ========================================
function AccountSection() {
  const { user } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setUpdating(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (error) throw error;
      
      setStatusMessage({
        text: 'Profile updated successfully',
        type: 'success'
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to update profile',
        type: 'error'
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-2xl max-w-2xl mx-auto w-full">
      <h2 className="text-2xl font-extrabold text-white mb-6">Account Details</h2>

      {statusMessage && (
        <div className={`p-4 rounded-xl border mb-6 text-sm ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950/40 border-red-500/30 text-red-300'
        }`}>
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
          <input
            type="text"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 cursor-not-allowed outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={updating}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50"
        >
          {updating ? 'Updating...' : 'Save Profile Details'}
        </button>
      </form>
    </div>
  );
}

// ========================================
// Manual Task Creation Sub-component
// ========================================
function AddTaskSection({ onSuccess }: { onSuccess: () => void }) {
  const { addTask } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgencyScore, setUrgencyScore] = useState<UrgencyScore>('MEDIUM');
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [immediateFirstStep, setImmediateFirstStep] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        urgencyScore,
        estimatedHours,
        immediateFirstStep: immediateFirstStep.trim() || 'Review requirements',
        actionableChecklist: ['Review primary targets', 'Execute task checklist'],
        deadline: deadline ? new Date(deadline) : null
      });

      // Clear fields
      setTitle('');
      setDescription('');
      setUrgencyScore('MEDIUM');
      setEstimatedHours(1);
      setImmediateFirstStep('');
      setDeadline('');
      
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-2xl max-w-2xl mx-auto w-full">
      <h2 className="text-2xl font-extrabold text-white mb-6">Create New Task</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Task Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Write task objective"
            required
            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context and notes for this task"
            rows={3}
            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Urgency Level</label>
            <select
              value={urgencyScore}
              onChange={(e) => setUrgencyScore(e.target.value as UrgencyScore)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            >
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Estimated Effort (Hours)</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">First Immediate Action Step</label>
            <input
              type="text"
              value={immediateFirstStep}
              onChange={(e) => setImmediateFirstStep(e.target.value)}
              placeholder="Concrete 5-minute step"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Target Date (Deadline)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}

// ========================================
// Main Dashboard View Component
// ========================================
function Dashboard() {
  const { state, signOut, updateTaskStatus } = useApp();
  const [activeTab, setActiveTab] = useState<'tasks' | 'add' | 'accounts'>('tasks');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [orderedTaskIds, setOrderedTaskIds] = useState<string[]>([]);

  // Compute stats accurately
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.status === 'Done').length;
  const missedTasks = state.tasks.filter(t => t.status === 'Missed').length;
  
  // Calculate best streak from habits
  const bestStreak = state.habits.length > 0 
    ? Math.max(...state.habits.map(h => h.streakDays), 0)
    : 0;

  // Handle AI dynamic scheduling
  const handleAISchedule = async () => {
    if (state.tasks.length === 0) {
      setStatusMessage('No tasks available to schedule');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsScheduling(true);
    setStatusMessage('Generating optimal AI schedule...');
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tasks: state.tasks
        })
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.order)) {
        setOrderedTaskIds(data.order);
        setStatusMessage('Tasks rearranged successfully by AI schedule');
      } else {
        // Mapped fallback sorting if AI fails
        const fallbackOrder = [...state.tasks]
          .sort((a, b) => {
            const urgencyVal = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return urgencyVal[a.urgencyScore] - urgencyVal[b.urgencyScore];
          })
          .map(t => t.id);
        setOrderedTaskIds(fallbackOrder);
        setStatusMessage('AI scheduling fallback: prioritized by urgency score');
      }
    } catch (err) {
      console.error('Scheduling error:', err);
      setStatusMessage('Failed to connect to scheduler service');
    } finally {
      setIsScheduling(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Arrange tasks list based on AI recommended order or urgency
  const sortedTasks = [...state.tasks].sort((a, b) => {
    if (orderedTaskIds.length > 0) {
      const indexA = orderedTaskIds.indexOf(a.id);
      const indexB = orderedTaskIds.indexOf(b.id);
      
      // If both are in the ordered array, respect AI order
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // Put unscheduled tasks at the end
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    
    // Default fallback sorting
    const urgencyVal = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return urgencyVal[a.urgencyScore] - urgencyVal[b.urgencyScore];
  });

  const handleStatusToggle = (task: Task, newStatus: TaskStatus) => {
    updateTaskStatus(task.id, newStatus);
  };

  const urgencyBadgeColor = {
    HIGH: 'bg-red-500/20 text-red-300 border-red-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    LOW: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative z-10">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-900 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-extrabold text-white text-2xl tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Firefly
            </span>
            <div className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'tasks' ? 'bg-slate-900 text-white border border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tasks
              </button>
              <button 
                onClick={() => setActiveTab('add')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'add' ? 'bg-slate-900 text-white border border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Add Task
              </button>
              <button 
                onClick={() => setActiveTab('accounts')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'accounts' ? 'bg-slate-900 text-white border border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Accounts
              </button>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={signOut}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-855 text-slate-300 hover:text-white border border-slate-805 rounded-xl text-xs font-bold transition-all"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile hamburger menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-400 hover:text-white focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          <div className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between z-50">
            <div>
              <div className="flex items-center justify-between mb-8">
                <span className="font-extrabold text-white text-xl">Firefly</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <nav className="space-y-3">
                <button 
                  onClick={() => { setActiveTab('tasks'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Tasks
                </button>
                <button 
                  onClick={() => { setActiveTab('add'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === 'add' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Add Task
                </button>
                <button 
                  onClick={() => { setActiveTab('accounts'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === 'accounts' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Accounts
                </button>
              </nav>
            </div>
            
            <div className="border-t border-slate-800 pt-6">
              <button
                onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all border border-slate-750"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'accounts' && <AccountSection />}
          {activeTab === 'add' && <AddTaskSection onSuccess={() => setActiveTab('tasks')} />}
          
          {activeTab === 'tasks' && (
            <>
              {/* Header Tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsTile label="Days Consistent" value={bestStreak} description="Longest habit streak completed" />
                <StatsTile label="Total Tasks" value={totalTasks} description="All scheduled workspace items" />
                <StatsTile label="Completed" value={completedTasks} description="Tasks marked done" />
                <StatsTile label="Missed" value={missedTasks} description="Items past target deadlines" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={handleAISchedule}
                  disabled={isScheduling}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {isScheduling ? 'Scheduling...' : 'Make Timetable'}
                </button>
              </div>

              {statusMessage && (
                <div className="mb-8 p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm flex items-center justify-between">
                  <span>{statusMessage}</span>
                  <button onClick={() => setStatusMessage(null)} className="text-indigo-400 hover:text-white font-bold ml-2">Dismiss</button>
                </div>
              )}

              {/* Tasks List */}
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6">Prioritized Task Feed</h2>
                
                <div className="space-y-4">
                  {sortedTasks.map((task, index) => (
                    <div key={task.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="text-slate-500 text-xs font-bold font-mono">
                            Order {index + 1}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${urgencyBadgeColor[task.urgencyScore]}`}>
                            {task.urgencyScore}
                          </span>
                          {task.estimatedHours && (
                            <span className="text-slate-400 text-xs font-medium">
                              Estimated: {task.estimatedHours}h
                            </span>
                          )}
                          {task.deadline && (
                            <span className="text-slate-400 text-xs font-medium">
                              Due: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white">{task.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{task.description || 'No additional details provided'}</p>
                        <div className="text-xs text-slate-500 mt-2">
                          Next action: {task.immediateFirstStep}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                        {task.status !== 'Done' ? (
                          <button
                            onClick={() => handleStatusToggle(task, 'Done')}
                            className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 hover:text-white text-slate-300 font-bold text-xs rounded-lg border border-slate-800 transition-all"
                          >
                            Mark Done
                          </button>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg">
                            Done
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                          task.status === 'Pending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          task.status === 'Stuck' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          task.status === 'Missed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {sortedTasks.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-lg">
                      No tasks yet. Click Add Task above to get started.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ========================================
// Responsive Sign-In Screen Component
// ========================================
function SignInScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : undefined,
        }
      });

      if (error) throw error;

      setMessage({
        text: 'Login/Signup link sent! Please check your email inbox to log in.',
        type: 'success'
      });
      setEmail('');
    } catch (err: any) {
      console.error('Auth error:', err);
      setMessage({
        text: err.message || 'Auth process failed. Please check details and try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden z-10">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl z-10 relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-extrabold text-2xl mb-4 shadow-lg shadow-blue-500/20">
            F
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Welcome to Firefly</h2>
          <p className="text-slate-400">Autonomous calendar tasks scheduling optimizer</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl border mb-6 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Login/Signup'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ========================================
// Dashboard Wrapper & Auth Check
// ========================================
function DashboardWrapper() {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse text-lg">Initializing Firefly...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <FirefliesBackground />
      {!user ? <SignInScreen /> : <Dashboard />}
    </>
  );
}

// ========================================
// Main Page Export
// ========================================
export default function Home() {
  return (
    <AppProvider>
      <DashboardWrapper />
    </AppProvider>
  );
}