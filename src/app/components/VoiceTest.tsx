'use client'

import { useState } from 'react'

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

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

export default function VoiceTest() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [browserSupport, setBrowserSupport] = useState<'checking' | 'supported' | 'unsupported'>('checking')

  const checkBrowserSupport = () => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    setBrowserSupport(supported ? 'supported' : 'unsupported')
    return supported
  }

  const startRecording = () => {
    try {
      setError('')
      
      // Check browser support
      if (!checkBrowserSupport()) {
        setError('Your browser does not support speech recognition. Try Chrome or Edge.')
        return
      }

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognitionAPI()

      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const newTranscript = event.results[event.results.length - 1][0].transcript
        setTranscript(prev => prev + ' ' + newTranscript)
        console.log('Voice captured:', newTranscript)
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone permissions.')
        } else {
          setError(`Speech recognition error: ${event.error}`)
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        console.log('Speech recognition ended')
        setIsRecording(false)
      }

      recognition.start()
      setIsRecording(true)

    } catch (err: any) {
      setError(`Failed to start voice recording: ${err.message}`)
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    // In a real implementation, we would stop the recognition instance
  }

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl max-w-sm">
      <h3 className="text-lg font-bold text-white mb-3">🎤 Voice API Test</h3>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${browserSupport === 'checking' ? 'bg-yellow-500' : browserSupport === 'supported' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-slate-300">
            {browserSupport === 'checking' && 'Checking browser support...'}
            {browserSupport === 'supported' && 'Browser supports Web Speech API'}
            {browserSupport === 'unsupported' && 'Browser does not support Web Speech API'}
          </span>
        </div>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full px-4 py-2 rounded-lg font-bold transition-all ${
            isRecording 
              ? 'bg-red-600 text-white animate-pulse' 
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {isRecording ? '● Stop Recording' : 'Start Test Recording'}
        </button>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-red-300 text-sm font-medium">Error</p>
            <p className="text-red-400 text-xs mt-1">{error}</p>
          </div>
        )}

        {transcript && (
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
            <p className="text-slate-300 text-sm font-medium mb-1">Transcript:</p>
            <p className="text-white text-sm">{transcript}</p>
          </div>
        )}

        <div className="text-xs text-slate-500">
          <p className="font-medium mb-1">Supported Browsers:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Chrome 25+</li>
            <li>Edge 79+</li>
            <li>Safari 14.1+ (with prefix)</li>
          </ul>
          <p className="mt-2">Note: Requires microphone permissions.</p>
        </div>
      </div>
    </div>
  )
}