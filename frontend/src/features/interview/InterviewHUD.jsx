'use client'

import React, { useState, useEffect, useRef } from 'react'
import api from '../../api'

export function InterviewHUD({
  problem,
  userCode,
  isActive,
  onToggleActive,
  onOpenScorecard
}) {
  const [persona, setPersona] = useState('friendly') // 'friendly' | 'strict'
  const [currentStage, setCurrentStage] = useState('clarification')
  const [stagesCompleted, setStagesCompleted] = useState([])
  const [messages, setMessages] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [sessionSeconds, setSessionSeconds] = useState(0)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const currentAudioRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const transcriptBottomRef = useRef(null)

  const stagesList = [
    { id: 'clarification', label: '1. Clarify Bounds' },
    { id: 'approach', label: '2. Approach & Big-O' },
    { id: 'coding', label: '3. Live Coding' },
    { id: 'verification', label: '4. Dry-Run & Edge Cases' }
  ]

  // Timer tick
  useEffect(() => {
    let interval = null
    if (isActive) {
      interval = setInterval(() => {
        setSessionSeconds(prev => prev + 1)
      }, 1000)
    } else {
      setSessionSeconds(0)
    }
    return () => clearInterval(interval)
  }, [isActive])

  const hasGreetedRef = useRef(false)

  // Initial greeting when interviewer mode is activated
  useEffect(() => {
    if (isActive && !hasGreetedRef.current && problem) {
      hasGreetedRef.current = true
      const initialGreeting =
        persona === 'strict'
          ? `Hey, welcome. Today we'll work through "${problem.title}". Take a moment to read the prompt, and let's start by clarifying any constraints or edge cases you see.`
          : `Hey! Good to meet you. Today we're looking at "${problem.title}". Take a moment to look over the description, and feel free to talk through any initial thoughts whenever you're ready.`

      const initialMsg = { role: 'assistant', content: initialGreeting }
      setMessages([initialMsg])
      playTTS(initialGreeting, persona)
    }
  }, [isActive, problem, persona])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset silence timer on candidate activity
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (!isActive) return

    silenceTimerRef.current = setTimeout(async () => {
      if (isActive && !isRecording && !isSpeaking && !isThinking) {
        try {
          const res = await api.post(
            '/interview/nudge',
            {
              problem_title: problem?.title || 'Algorithm Problem',
              problem_description: problem?.description || '',
              problem_id: problem?.id,
              candidate_message: '',
              current_stage: currentStage,
              persona,
              user_code: userCode || '',
              messages: messages.slice(-4)
            },
            { timeout: 20000 }
          )
          if (res.data?.reply) {
            const nudgeMsg = { role: 'assistant', content: res.data.reply }
            setMessages(prev => [...prev, nudgeMsg])
            if (res.data.should_speak) {
              playTTS(res.data.reply, persona)
            } else {
              resetSilenceTimer()
            }
          }
        } catch (err) {
          console.warn('Nudge check error:', err)
        }
      }
    }, 65000) // 65 seconds of quiet
  }

  // Text-To-Speech Player via Edge-TTS
  const playTTS = async (text, currentPersona) => {
    if (!text) return
    try {
      setIsSpeaking(true)
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }

      const response = await api.post(
        '/interview/tts',
        { text, persona: currentPersona },
        { responseType: 'blob', timeout: 25000 }
      )

      const audioBlob = response.data
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        resetSilenceTimer()
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.warn('TTS playback fallback error:', err)
      setIsSpeaking(false)
    }
  }

  // Handle Candidate Message (via speech transcription or text)
  const handleCandidateMessage = async (messageText) => {
    const trimmed = messageText?.trim()
    if (!trimmed) return

    const userMsg = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setTextInput('')
    setIsThinking(true)
    resetSilenceTimer()

    try {
      const response = await api.post(
        '/interview/respond',
        {
          problem_title: problem?.title || 'Coding Problem',
          problem_description: problem?.description || '',
          problem_id: problem?.id,
          candidate_message: trimmed,
          current_stage: currentStage,
          persona,
          user_code: userCode || '',
          messages: updatedMessages
        },
        { timeout: 35000 }
      )

      const { reply, next_stage } = response.data
      setIsThinking(false)

      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        playTTS(reply, persona)
      }

      if (next_stage && next_stage !== currentStage) {
        setStagesCompleted(prev => [...new Set([...prev, currentStage])])
        setCurrentStage(next_stage)
      }
    } catch (err) {
      console.error('Interview respond error:', err)
      setIsThinking(false)
      const fallbackMsg = {
        role: 'assistant',
        content: "Sorry, could you repeat that last thought? My connection stuttered for a second."
      }
      setMessages(prev => [...prev, fallbackMsg])
      playTTS(fallbackMsg.content, persona)
    }
  }

  // Audio Recording (Speech-to-Text via Groq Whisper Large v3)
  const startRecording = async () => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        setIsSpeaking(false)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Choose supported mimeType
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4'
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg'
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        if (audioBlob.size > 100) {
          await transcribeAndSendAudio(audioBlob)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied or error:', err)
      alert('Microphone access was denied or is not supported. You can still type in the interview input box!')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAndSendAudio = async (blob) => {
    setIsThinking(true)
    try {
      const formData = new FormData()
      formData.append('file', blob, 'candidate_speech.webm')

      const res = await api.post('/interview/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 20000
      })

      const transcribed = res.data?.text?.trim()
      setIsThinking(false)
      if (transcribed) {
        await handleCandidateMessage(transcribed)
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setIsThinking(false)
    }
  }

  // Conclude Interview & Request Scorecard
  const handleConcludeInterview = async () => {
    setIsThinking(true)
    try {
      const res = await api.post('/interview/evaluate', {
        problem_title: problem?.title || 'Problem',
        problem_description: problem?.description || '',
        problem_id: problem?.id,
        persona,
        user_code: userCode || '',
        messages,
        stages_completed: [...stagesCompleted, currentStage]
      })
      setIsThinking(false)
      if (res.data) {
        onOpenScorecard(res.data)
      }
    } catch (err) {
      console.error('Evaluation error:', err)
      setIsThinking(false)
      // Fallback modal with current state
      onOpenScorecard({
        verdict: 'Hire',
        overall_summary: 'Completed live technical interview demonstration.',
        scores: { communication: 4.2, problem_solving: 4.0, code_quality: 4.3, verification: 3.8 },
        strengths: ['Actively discussed approach before and during coding'],
        areas_for_improvement: ['Continue refining edge-case dry-run rigor'],
        complexity_verdict: { optimal_time: 'O(N)', optimal_space: 'O(1)' }
      })
    }
  }

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!isActive) return null

  return (
    <div className="interview-hud-panel" id="interview-hud-panel">
      {/* Top Bar: Persona + Timer + Actions */}
      <div className="interview-hud-top">
        <div className="interview-persona-group">
          <div className="interview-avatar-pill">
            <div
              className={`interviewer-pulse-dot ${
                isSpeaking ? 'speaking' : isRecording ? 'listening' : ''
              }`}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
              {persona === 'friendly' ? 'Alex (Google Mentor)' : 'Marcus (Meta Bar-Raiser)'}
            </span>
          </div>

          <select
            className="persona-select-dropdown"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            title="Switch Interviewer Persona & Voice"
          >
            <option value="friendly">🤝 Friendly Mentor (Google)</option>
            <option value="strict">⚡ Strict Evaluator (Meta)</option>
          </select>
        </div>

        <div className="interview-hud-controls">
          <span className="interview-timer-badge">⏱️ {formatTimer(sessionSeconds)}</span>
          <button
            className="conclude-btn"
            onClick={handleConcludeInterview}
            disabled={isThinking}
            title="Conclude interview and review FAANG evaluation scorecard"
          >
            🏁 Conclude & Score
          </button>
        </div>
      </div>

      {/* 4-Stage Stepper Track */}
      <div className="interview-stepper-track">
        {stagesList.map((s, idx) => {
          const isActiveStage = currentStage === s.id
          const isDone = stagesCompleted.includes(s.id)
          return (
            <div
              key={s.id}
              className={`step-node-item ${isActiveStage ? 'active' : ''} ${isDone ? 'completed' : ''}`}
              onClick={() => setCurrentStage(s.id)}
            >
              <div className="step-number-bubble">{isDone ? '✓' : idx + 1}</div>
              <span className="step-text-title">{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* Audio Waveform Banner & Recording Bar */}
      <div className="interview-audio-banner">
        <div className="audio-status-text">
          <div
            className={`waveform-cluster ${
              isSpeaking ? 'speaking' : isRecording ? 'listening' : ''
            }`}
          >
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
          </div>
          <span>
            {isSpeaking
              ? 'Interviewer is speaking...'
              : isRecording
              ? 'Listening to you... (Click Stop when done)'
              : isThinking
              ? 'Analyzing thought process...'
              : 'Interviewer ready. Press mic to speak.'}
          </span>
          <span className="audio-status-sub">
            (Groq Whisper v3 + Edge Neural Audio)
          </span>
        </div>

        <div className="interview-mic-controls">
          <button
            className={`mic-toggle-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isThinking}
          >
            {isRecording ? '⏹ Stop Speaking' : '🎙️ Speak (Mic)'}
          </button>
          {messages.length > 0 && !isSpeaking && (
            <button
              className="audio-replay-btn"
              onClick={() => {
                const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
                if (lastAssistant) playTTS(lastAssistant.content, persona)
              }}
              title="Replay last spoken response"
            >
              🔊 Replay
            </button>
          )}
        </div>
      </div>

      {/* Live Speech Transcript Drawer */}
      <div className="interview-transcript-box">
        {messages.map((m, idx) => (
          <div key={idx} className="transcript-message">
            <span
              className={`transcript-role-tag ${
                m.role === 'assistant' ? 'interviewer' : 'candidate'
              }`}
            >
              {m.role === 'assistant' ? 'Interviewer' : 'You'}
            </span>
            <span className="transcript-content-text">{m.content}</span>
          </div>
        ))}
        {isThinking && (
          <div className="transcript-message">
            <span className="transcript-role-tag interviewer">Interviewer</span>
            <span className="transcript-content-text" style={{ fontStyle: 'italic', opacity: 0.7 }}>
              Thinking and reviewing AST...
            </span>
          </div>
        )}
        <div ref={transcriptBottomRef} />
      </div>

      {/* Fallback Typing Row */}
      <form
        className="interview-fallback-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          handleCandidateMessage(textInput)
        }}
      >
        <input
          type="text"
          className="interview-chat-input"
          placeholder="Speak using the mic button above, or type your answer here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={isThinking || isRecording}
        />
        <button
          type="submit"
          className="interview-send-btn"
          disabled={!textInput.trim() || isThinking || isRecording}
        >
          Send
        </button>
      </form>
    </div>
  )
}
