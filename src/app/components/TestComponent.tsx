'use client'

import { useApp } from '@/src/context/AppContext'

export default function TestComponent() {
  const { state } = useApp()
  
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border text-sm">
      <h3 className="font-medium mb-2">Context Test</h3>
      <div className="space-y-1">
        <p>Tasks: {state.tasks.length}</p>
        <p>Habits: {state.habits.length}</p>
        <p>Recording: {state.isRecordingVoice ? 'ON' : 'OFF'}</p>
        <p>Email Draft: {state.activeEmailDraft ? 'Active' : 'None'}</p>
      </div>
    </div>
  )
}