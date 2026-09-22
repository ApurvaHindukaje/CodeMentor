'use client'

import React, { useState, useRef, useEffect } from 'react'
import api from '../../api'

export function AIMentorDrawer({ isOpen, onClose, problem, userCode }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey! I'm your AI assistant for this problem. Feel free to ask questions, brainstorm approaches, or ask for hints or code reviews whenever you need.`
    }
  ])
  const [inputQuery, setInputQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (!isOpen) return null

  const handleSend = async (queryText, actionType = 'chat') => {
    const textToSend = queryText || inputQuery
    if (!textToSend.trim() || isLoading) return

    const userMessage = { role: 'user', content: textToSend }
    const updatedHistory = [...messages, userMessage]
    setMessages(updatedHistory)
    setInputQuery('')
    setIsLoading(true)

    // Prepare history payload (excluding welcome prompt)
    const historyPayload = updatedHistory
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(1) // exclude initial intro greeting
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const baseUrl = api.defaults.baseURL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://localhost:8000')
      const token = typeof window !== 'undefined' ? localStorage.getItem('cm_token') : null

      const response = await fetch(`${baseUrl}/ai/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          problem_title: problem?.title || 'Algorithm Problem',
          problem_description: problem?.description || '',
          user_code: userCode || '',
          action: actionType,
          custom_query: textToSend,
          messages: historyPayload
        })
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`)
      }

      // Add placeholder assistant message for live streaming
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      setIsLoading(false)

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let streamText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        streamText += chunk

        setMessages((prev) => {
          const next = [...prev]
          if (next.length > 0) {
            next[next.length - 1] = {
              role: 'assistant',
              content: streamText
            }
          }
          return next
        })
      }
    } catch (err) {
      console.warn('Streaming failed, falling back to standard assist:', err)
      try {
        const fallbackRes = await api.post('/ai/assist', {
          problem_title: problem?.title || 'Algorithm Problem',
          problem_description: problem?.description || '',
          user_code: userCode || '',
          action: actionType,
          custom_query: textToSend,
          messages: historyPayload
        })
        setMessages((prev) => {
          const next = [...prev]
          if (next.length > 0 && next[next.length - 1].role === 'assistant' && !next[next.length - 1].content) {
            next[next.length - 1] = {
              role: 'assistant',
              content: fallbackRes.data?.response || 'Guidance received.'
            }
            return next
          }
          return [...next, { role: 'assistant', content: fallbackRes.data?.response || 'Guidance received.' }]
        })
      } catch (fallbackErr) {
        console.warn('Fallback AI assist also failed:', fallbackErr)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '⚠️ Failed to reach CodeMentor AI service. Please ensure your backend is running.'
          }
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="ai-drawer-overlay" id="ai-mentor-overlay" onClick={onClose}>
      <div className="ai-drawer-panel" id="ai-mentor-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ai-drawer-header">
          <div className="ai-header-info">
            <div className="ai-avatar">✨</div>
            <div>
              <div className="ai-header-title">CodeMentor AI</div>
              <div className="ai-header-subtitle">Guiding on {problem?.title}</div>
            </div>
          </div>
          <button className="ai-close-btn" onClick={onClose} aria-label="Close AI Mentor">
            ✕
          </button>
        </div>

        <div className="ai-quick-actions">
          <button
            className="ai-quick-btn"
            onClick={() => handleSend('Can you give me a subtle hint without spoiling the solution?', 'hint')}
            disabled={isLoading}
          >
            💡 Subtle Hint
          </button>
          <button
            className="ai-quick-btn"
            onClick={() => handleSend('Analyze the Time and Space Complexity (Big-O) of my code.', 'analyze')}
            disabled={isLoading}
          >
            📊 Big-O Complexity
          </button>
          <button
            className="ai-quick-btn"
            onClick={() => handleSend('What is the optimal algorithmic intuition and approach for this problem?', 'explain')}
            disabled={isLoading}
          >
            📖 Optimal Pattern
          </button>
          <button
            className="ai-quick-btn"
            onClick={() => handleSend('Can you help me spot potential bugs or unhandled edge cases in my code?', 'chat')}
            disabled={isLoading}
          >
            🐛 Find Edge Cases
          </button>
        </div>

        <div className="ai-messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`ai-message ${msg.role}`}>
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}

          {isLoading && (
            <div className="ai-message assistant">
              <div className="message-bubble ai-loading-bubble">
                <span>⚡</span> CodeMentor is analyzing your code...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-input-area">
          <textarea
            className="ai-textarea"
            placeholder="Ask your mentor anything about this problem..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="ai-send-btn"
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || isLoading}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
