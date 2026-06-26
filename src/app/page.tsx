'use client'

import { AppProvider, useApp } from '@/src/context/AppContext'
import { Task } from '@/src/context/AppContext'
import { useState, useEffect } from 'react'

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

// ========================================
// Top Hero Section - Anti-Panic Micro-Step Catalyst
// ========================================
function AntiPanicMicroStepCatalyst() {
  const { state } = useApp()
  
  // Get highest priority task that's not done
  const highPriorityTask = state.tasks
    .filter(task => task.status !== 'Done')
    .sort((a, b) => {
      const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      return urgencyOrder[a.urgencyScore] - urgencyOrder[b.urgencyScore]
    })[0]

  if (!highPriorityTask) {
    return (
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 mb-6 border border-emerald-500/30 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-300 animate-pulse shadow-lg"></div>
              <h2 className="text-2xl font-bold text-white">🎯 All Clear – Ready for Action</h2>
            </div>
            <p className="text-emerald-100 text-lg">No urgent tasks. Perfect time to plan ahead or tackle long-term goals.</p>
          </div>
        </div>
      </div>
    )
  }

  const urgencyColor = {
    HIGH: 'from-red-600 to-red-700 border-red-500/30',
    MEDIUM: 'from-amber-600 to-amber-700 border-amber-500/30',
    LOW: 'from-blue-600 to-blue-700 border-blue-500/30'
  }

  return (
    <div className={`bg-gradient-to-r ${urgencyColor[highPriorityTask.urgencyScore]} rounded-2xl p-6 mb-6 border shadow-2xl`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/30">
              {highPriorityTask.urgencyScore} PRIORITY
            </span>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30">
              {highPriorityTask.estimatedHours}h estimated
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{highPriorityTask.title}</h2>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <p className="text-sm text-white/80 font-medium mb-2">🚀 IMMEDIATE FIRST STEP:</p>
            <p className="text-xl text-white font-semibold">{highPriorityTask.immediateFirstStep}</p>
          </div>
        </div>
        <div className="ml-6 text-right">
          <p className="text-white/70 text-sm mb-1">Deadline</p>
          <p className="text-white font-bold text-lg">
            {highPriorityTask.deadline ? new Date(highPriorityTask.deadline).toLocaleDateString() : 'Not set'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Firefighter Engine Panel (Conditional)
// ========================================
function FirefighterEnginePanel() {
  const { state, clearActiveEmailDraft, createFirefighterEmail } = useApp()

  // Only render if we have an active email draft
  if (!state.activeEmailDraft) return null

  const relatedTask = state.tasks.find(t => t.id === state.activeEmailDraft?.taskId)

  return (
    <div className="bg-gradient-to-br from-orange-900 to-red-900 rounded-2xl p-6 mb-6 border border-orange-500/40 shadow-2xl animate-pulse-slow">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-4 h-4 rounded-full bg-orange-400 animate-pulse shadow-lg"></div>
        <h2 className="text-2xl font-bold text-white">🚨 Firefighter Engine Activated</h2>
        <span className="ml-auto px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          ACTION REQUIRED
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-5 border border-orange-500/30">
          <p className="text-orange-300 text-sm font-semibold mb-2">RELATED TASK</p>
          <p className="text-white font-bold text-lg mb-1">{relatedTask?.title || 'Unknown Task'}</p>
          <p className="text-orange-200 text-sm">Status: {relatedTask?.status || 'Unknown'}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-5 border border-orange-500/30">
          <p className="text-orange-300 text-sm font-semibold mb-2">AUTO-GENERATED EMAIL</p>
          <p className="text-white font-bold mb-2">{state.activeEmailDraft.subject}</p>
          <p className="text-orange-100 text-sm mb-3 line-clamp-2">{state.activeEmailDraft.body}</p>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                alert(`Sending email to: ${state.activeEmailDraft?.recipient}\n\nIn production, this would integrate with SendGrid/Resend API`)
                clearActiveEmailDraft()
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🚀 1-Click Send Email
            </button>
            <button
              onClick={clearActiveEmailDraft}
              className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Side Panel - Input & Quick Actions
// ========================================
function SidePanel() {
  const { state, addTask, toggleVoiceRecording, dispatch } = useApp()
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    urgencyScore: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
    estimatedHours: 2,
    immediateFirstStep: '',
  })
  const [chaosDump, setChaosDump] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskForm.title.trim()) return

    addTask({
      ...taskForm,
      actionableChecklist: [],
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    })
    
    setTaskForm({
      title: '',
      description: '',
      urgencyScore: 'MEDIUM',
      estimatedHours: 2,
      immediateFirstStep: '',
    })
  }

  const handleParseChaosDump = async () => {
    if (!chaosDump.trim()) return
    
    setIsParsing(true)
    setParseError(null)
    
    try {
      // Send POST request to our Gemini AI agent backend
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskInput: chaosDump }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle API errors
        const errorMessage = data.error || data.details || 'Failed to parse chaos dump'
        throw new Error(errorMessage)
      }

      if (!data.success || !data.task) {
        throw new Error('Invalid response from AI agent')
      }

      // Extract the structured task from the response
      const parsedTask = data.task
      
      // Create a new Task object matching our frontend interface
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: parsedTask.title,
        description: parsedTask.description,
        urgencyScore: parsedTask.urgencyScore,
        status: 'Pending',
        estimatedHours: parsedTask.estimatedHours,
        immediateFirstStep: parsedTask.immediateFirstStep,
        actionableChecklist: parsedTask.actionableChecklist,
        deadline: new Date(parsedTask.deadline),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Use our context dispatch to add the task to global state
      dispatch({ type: 'ADD_TASK', payload: newTask })
      
      // Clear the textarea input
      setChaosDump('')
      
      // Show success notification
      setParseError(null)
      // In a production app, you might show a toast notification here
      console.log(`✅ AI parsed task: "${newTask.title}" (${newTask.urgencyScore} priority)`)

    } catch (error: any) {
      // Handle errors gracefully
      console.error('Error parsing chaos dump:', error)
      setParseError(error.message || 'Failed to parse with AI. Please try again.')
      
      // Fallback: Use the old mock parsing as backup
      console.log('⚠️ Falling back to basic parsing...')
      const lines = chaosDump.split('\n').filter(line => line.trim())
      addTask({
        title: lines[0]?.substring(0, 50) || 'Chaos Dump Task',
        description: chaosDump,
        urgencyScore: 'MEDIUM',
        estimatedHours: 2,
        immediateFirstStep: 'Review and organize this task',
        actionableChecklist: lines.slice(1, 4),
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      })
      setChaosDump('')
      
    } finally {
      setIsParsing(false)
    }
  }

  const toggleHabit = (habitId: string) => {
    dispatch({ type: 'TOGGLE_HABIT', payload: habitId })
  }

  // Clean up speech recognition on component unmount
  useEffect(() => {
    return () => {
      if (speechRecognition) {
        speechRecognition.stop()
        setSpeechRecognition(null)
      }
      if (state.isRecordingVoice) {
        dispatch({ type: 'SET_IS_RECORDING_VOICE', payload: false })
      }
    }
  }, [speechRecognition, state.isRecordingVoice])

  // Real Web Speech API implementation
  const handleVoiceRecording = () => {
    try {
      // Check if browser supports Speech Recognition
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      
      if (!SpeechRecognitionAPI) {
        throw new Error('Your browser does not support speech recognition. Try Chrome or Edge.')
      }

      if (!state.isRecordingVoice) {
        // Starting recording
        const recognition = new SpeechRecognitionAPI()
        
        // Configure recognition parameters
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = 'en-US'

        // Set up event handlers
        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript
          
          // Append spoken text to the chaos dump textarea
          setChaosDump(prev => {
            const separator = prev.trim() ? '\n' : ''
            return prev + separator + transcript
          })
          
          // Update last voice recording in state
          dispatch({ type: 'SET_LAST_VOICE_RECORDING', payload: transcript })
          
          console.log('🎤 Voice captured:', transcript)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          
          if (event.error === 'not-allowed') {
            throw new Error('Microphone access denied. Please allow microphone permissions.')
          } else if (event.error === 'no-speech') {
            // This is okay, just no speech detected
            console.log('No speech detected')
          } else {
            throw new Error(`Speech recognition error: ${event.error}`)
          }
        }

        recognition.onend = () => {
          console.log('Speech recognition ended')
          // Only reset if we're not intentionally stopping
          if (state.isRecordingVoice) {
            dispatch({ type: 'SET_IS_RECORDING_VOICE', payload: false })
            setSpeechRecognition(null)
          }
        }

        // Start recognition
        recognition.start()
        setSpeechRecognition(recognition)
        dispatch({ type: 'SET_IS_RECORDING_VOICE', payload: true })
        
        console.log('🎤 Started voice recording...')

      } else {
        // Stopping recording
        if (speechRecognition) {
          speechRecognition.stop()
          setSpeechRecognition(null)
        }
        dispatch({ type: 'SET_IS_RECORDING_VOICE', payload: false })
        
        console.log('🎤 Stopped voice recording')
      }

    } catch (error: any) {
      console.error('Voice recording error:', error)
      
      // Show user-friendly error message
      alert(`Voice recording failed: ${error.message}`)
      
      // Reset state on error
      if (speechRecognition) {
        speechRecognition.stop()
        setSpeechRecognition(null)
      }
      dispatch({ type: 'SET_IS_RECORDING_VOICE', payload: false })
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl h-full">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <span>⚡</span> Quick Actions
      </h2>
      
      <div className="space-y-6">
        {/* Manual Task Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Task Title</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
              placeholder="What needs to get done?"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Immediate First Step</label>
            <input
              type="text"
              value={taskForm.immediateFirstStep}
              onChange={(e) => setTaskForm({...taskForm, immediateFirstStep: e.target.value})}
              placeholder="What's the very next action?"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Urgency</label>
              <select
                value={taskForm.urgencyScore}
                onChange={(e) => setTaskForm({...taskForm, urgencyScore: e.target.value as any})}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="HIGH">🔴 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Hours</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={taskForm.estimatedHours}
                onChange={(e) => setTaskForm({...taskForm, estimatedHours: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            ➕ Add Task
          </button>
        </form>

        {/* Chaos Dump */}
        <div className="pt-6 border-t border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-slate-300">🌪️ Chaos Dump</label>
            <button
              type="button"
              onClick={handleParseChaosDump}
              disabled={!chaosDump.trim() || isParsing}
              className="text-sm text-blue-400 hover:text-blue-300 font-semibold disabled:text-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isParsing ? (
                <>
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  Parsing...
                </>
              ) : (
                'Parse with AI →'
              )}
            </button>
          </div>
          <textarea
            value={chaosDump}
            onChange={(e) => {
              setChaosDump(e.target.value)
              setParseError(null) // Clear error when user types
            }}
            placeholder="Paste messy notes, emails, thoughts... Firefly will organize it"
            rows={4}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
          />
          
          {/* Error message display */}
          {parseError && (
            <div className="mt-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-sm">⚠️</span>
                <div>
                  <p className="text-red-300 text-sm font-medium">AI Parsing Error</p>
                  <p className="text-red-400 text-xs mt-1">{parseError}</p>
                  <p className="text-red-400/70 text-xs mt-1">
                    Using basic parsing as fallback. Check your API key in .env.local
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading overlay */}
          {isParsing && (
            <div className="mt-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="text-blue-300 text-sm font-medium">AI is analyzing your chaos dump...</p>
                  <p className="text-blue-400/70 text-xs mt-1">
                    Gemini 3.5 Flash is extracting tasks, urgency, and deadlines
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Help text */}
          {!chaosDump.trim() && !isParsing && !parseError && (
            <div className="mt-2 text-xs text-slate-500">
              💡 Try pasting: "Need to prepare client presentation by Friday, update financials, coordinate with marketing"
            </div>
          )}
        </div>

        {/* Voice Dump */}
        <div className="pt-6 border-t border-slate-700">
          <label className="block text-sm font-semibold text-slate-300 mb-3">🎤 Voice Dump</label>
          <button
            onClick={handleVoiceRecording}
            className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-lg font-bold transition-all ${
              state.isRecordingVoice 
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white animate-pulse shadow-lg shadow-red-500/50' 
                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl'
            }`}
          >
            {state.isRecordingVoice ? (
              <>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span>● RECORDING... Speak now</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>Start Voice Note</span>
              </>
            )}
          </button>
          {state.lastVoiceRecording.text && (
            <div className="mt-3 p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-purple-300 mb-1">Last voice note:</p>
                  <p className="text-white text-sm">{state.lastVoiceRecording.text}</p>
                </div>
                <button
                  onClick={() => {
                    // Append last recording to chaos dump
                    setChaosDump(prev => {
                      const separator = prev.trim() ? '\n' : ''
                      return prev + separator + state.lastVoiceRecording.text
                    })
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                >
                  Add to dump →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Habits & Goals */}
        <div className="pt-6 border-t border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>✨</span> Habits & Goals
          </h3>
          <div className="space-y-3">
            {state.habits.map(habit => (
              <div key={habit.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors">
                <div>
                  <p className="font-semibold text-white">{habit.title}</p>
                  <p className="text-sm text-slate-400">🔥 {habit.streakDays} day streak</p>
                </div>
                <button 
                  onClick={() => toggleHabit(habit.id)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                    habit.completedToday 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/50' 
                      : 'border-slate-500 hover:border-emerald-500 hover:bg-slate-700'
                  }`}
                >
                  {habit.completedToday && <span className="text-xl">✓</span>}
                </button>
              </div>
            ))}
            <button className="w-full p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors font-semibold">
              + Add New Habit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Main Panel - Smart Timetable & Prioritized Feed
// ========================================
function MainPanel() {
  const { state, updateTaskStatus, markTaskAsMissed, createFirefighterEmail } = useApp()

  const urgencyGroups = {
    HIGH: state.tasks.filter(t => t.urgencyScore === 'HIGH'),
    MEDIUM: state.tasks.filter(t => t.urgencyScore === 'MEDIUM'),
    LOW: state.tasks.filter(t => t.urgencyScore === 'LOW'),
  }

  const handleStatusChange = (taskId: string, newStatus: 'Pending' | 'Done' | 'Stuck' | 'Missed') => {
    updateTaskStatus(taskId, newStatus)
    
    // Trigger firefighter panel when task is stuck or missed
    if (newStatus === 'Stuck' || newStatus === 'Missed') {
      const task = state.tasks.find(t => t.id === taskId)
      if (task) {
        createFirefighterEmail(task, 'team@example.com')
      }
    }
  }

  const urgencyConfig = {
    HIGH: {
      label: 'HIGH PRIORITY',
      icon: '🔴',
      gradient: 'from-red-900/50 to-red-800/50',
      border: 'border-red-500/30',
      badge: 'bg-red-500/20 text-red-300 border-red-500/40'
    },
    MEDIUM: {
      label: 'MEDIUM PRIORITY',
      icon: '🟡',
      gradient: 'from-amber-900/50 to-amber-800/50',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    },
    LOW: {
      label: 'LOW PRIORITY',
      icon: '🟢',
      gradient: 'from-emerald-900/50 to-emerald-800/50',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    }
  }

  const statusConfig = {
    Pending: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    Done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    Stuck: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    Missed: 'bg-red-500/20 text-red-300 border-red-500/40'
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <span>📊</span> Smart Timetable & Task Feed
      </h2>
      
      <div className="space-y-6">
        {Object.entries(urgencyGroups).map(([urgency, tasks]) => {
          const config = urgencyConfig[urgency as keyof typeof urgencyConfig]
          
          if (tasks.length === 0) return null

          return (
            <div key={urgency} className={`bg-gradient-to-br ${config.gradient} rounded-xl p-5 border ${config.border}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${config.badge}`}>
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="bg-slate-900/70 backdrop-blur-sm rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-lg mb-1">{task.title}</h4>
                        <p className="text-slate-400 text-sm mb-2">{task.description || 'No description'}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-500">⚡ {task.immediateFirstStep}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ml-3 ${statusConfig[task.status]}`}>
                        {task.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>⏱️ {task.estimatedHours}h</span>
                        {task.deadline && (
                          <span>📅 {new Date(task.deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(task.id, 'Done')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            task.status === 'Done'
                              ? 'bg-emerald-500 text-white shadow-lg'
                              : 'bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white border border-slate-600'
                          }`}
                        >
                          ✓ Done
                        </button>
                        <button
                          onClick={() => handleStatusChange(task.id, 'Stuck')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            task.status === 'Stuck'
                              ? 'bg-orange-500 text-white shadow-lg'
                              : 'bg-slate-800 text-slate-400 hover:bg-orange-500 hover:text-white border border-slate-600'
                          }`}
                        >
                          ⚠️ Stuck
                        </button>
                        <button
                          onClick={() => handleStatusChange(task.id, 'Missed')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            task.status === 'Missed'
                              ? 'bg-red-500 text-white shadow-lg'
                              : 'bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white border border-slate-600'
                          }`}
                        >
                          ✕ Missed
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {state.tasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No tasks yet. Add your first task to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ========================================
// Main Dashboard Component
// ========================================
function Dashboard() {
  const { state } = useApp()

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="text-5xl">🔥</span>
                Firefly AI
              </h1>
              <p className="text-slate-400 text-lg">Autonomous productivity agent with Firefighter loop</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right bg-slate-900 px-6 py-3 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Active Tasks</p>
                <p className="font-bold text-white text-2xl">{state.tasks.filter(t => t.status !== 'Done').length}</p>
              </div>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                🤖 Generate Weekly Plan
              </button>
            </div>
          </div>
        </header>

        {/* Top Hero Section */}
        <AntiPanicMicroStepCatalyst />
        <FirefighterEnginePanel />

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Side Panel - Input & Quick Actions */}
          <div className="lg:col-span-1">
            <SidePanel />
          </div>

          {/* Main Panel - Timetable & Task Feed */}
          <div className="lg:col-span-2">
            <MainPanel />
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Total Tasks</p>
            <p className="text-3xl font-bold text-white">{state.tasks.length}</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Completed</p>
            <p className="text-3xl font-bold text-emerald-400">{state.tasks.filter(t => t.status === 'Done').length}</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Active Habits</p>
            <p className="text-3xl font-bold text-purple-400">{state.habits.length}</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Best Streak</p>
            <p className="text-3xl font-bold text-orange-400">{Math.max(...state.habits.map(h => h.streakDays), 0)} days</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Main Page Export
// ========================================
export default function Home() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  )

}