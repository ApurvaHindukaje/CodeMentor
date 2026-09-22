'use client'

import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import api from '../../api'

function ComplexityBenchmarkCard({ analysis }) {
  if (!analysis) return null
  const { time, space } = analysis

  const timeTiers = ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'O(N²)', 'O(2^N)']
  const spaceTiers = ['O(1)', 'O(log N)', 'O(N)', 'O(N²)']

  return (
    <div className="complexity-benchmark-container" id="complexity-benchmark-card">
      <div className="complexity-benchmark-header">
        <div className="benchmark-title-group">
          <span className="benchmark-icon">📊</span>
          <span className="benchmark-title">Algorithmic Asymptotic Complexity</span>
        </div>
        <span className="benchmark-subtitle">Real Big-O Comparison vs Optimal Target (No Fake Benchmarks)</span>
      </div>

      <div className="complexity-graphs-grid">
        {/* Graph 1: Time Complexity */}
        <div className="complexity-graph-card" id="graph-time-complexity">
          <div className="graph-card-header">
            <span className="graph-badge time-badge">⏱️ Time Complexity</span>
            <span className={`graph-verdict-pill ${time?.is_optimal ? 'verdict-optimal' : 'verdict-suboptimal'}`}>
              {time?.is_optimal ? '⚡ Optimal Time' : `⚠️ ${time?.verdict || 'Suboptimal'}`}
            </span>
          </div>

          <div className="spectrum-track-wrapper">
            <div className="spectrum-track-rail">
              {timeTiers.map((tierLabel, idx) => {
                const isOptimalTarget = idx === time?.optimal_tier
                const isUserChoice = idx === time?.user_tier
                const isBoth = isOptimalTarget && isUserChoice

                return (
                  <div
                    key={tierLabel}
                    className={`spectrum-node ${
                      isBoth ? 'node-matched' : isOptimalTarget ? 'node-optimal' : isUserChoice ? 'node-user' : ''
                    }`}
                  >
                    <div className="spectrum-node-tick" />
                    <span className="spectrum-node-label">{tierLabel}</span>

                    {isBoth && (
                      <div className="spectrum-pin pin-matched" title="Your code achieved optimal time!">
                        <span className="pin-pill">⚡ Optimal: {tierLabel} ✓</span>
                        <div className="pin-pointer" />
                      </div>
                    )}
                    {!isBoth && isOptimalTarget && (
                      <div className="spectrum-pin pin-optimal" title="Optimal target for this problem">
                        <span className="pin-pill">🎯 Optimal: {tierLabel}</span>
                        <div className="pin-pointer" />
                      </div>
                    )}
                    {!isBoth && isUserChoice && (
                      <div className="spectrum-pin pin-user" title="Your code time complexity">
                        <span className="pin-pill">Your Code: {tierLabel}</span>
                        <div className="pin-pointer" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="graph-details-row">
            <div className="metric-compare-line">
              <span className="metric-label">Target:</span>
              <strong className="metric-val optimal">{time?.optimal || 'O(N)'}</strong>
              <span className="metric-divider">vs</span>
              <span className="metric-label">Your Code:</span>
              <strong className={`metric-val ${time?.is_optimal ? 'optimal' : 'suboptimal'}`}>
                {time?.user || 'O(N)'}
              </strong>
            </div>
            {time?.summary && <p className="complexity-explanation">{time.summary}</p>}
          </div>
        </div>

        {/* Graph 2: Space Complexity */}
        <div className="complexity-graph-card" id="graph-space-complexity">
          <div className="graph-card-header">
            <span className="graph-badge space-badge">💾 Space Complexity</span>
            <span className={`graph-verdict-pill ${space?.is_optimal ? 'verdict-optimal' : 'verdict-suboptimal'}`}>
              {space?.is_optimal ? '⚡ Optimal Space' : `⚠️ ${space?.verdict || 'Suboptimal'}`}
            </span>
          </div>

          <div className="spectrum-track-wrapper">
            <div className="spectrum-track-rail">
              {spaceTiers.map((tierLabel, idx) => {
                const isOptimalTarget = idx === space?.optimal_tier
                const isUserChoice = idx === space?.user_tier
                const isBoth = isOptimalTarget && isUserChoice

                return (
                  <div
                    key={tierLabel}
                    className={`spectrum-node ${
                      isBoth ? 'node-matched' : isOptimalTarget ? 'node-optimal' : isUserChoice ? 'node-user' : ''
                    }`}
                  >
                    <div className="spectrum-node-tick" />
                    <span className="spectrum-node-label">{tierLabel}</span>

                    {isBoth && (
                      <div className="spectrum-pin pin-matched" title="Your code achieved optimal space!">
                        <span className="pin-pill">⚡ Optimal: {tierLabel} ✓</span>
                        <div className="pin-pointer" />
                      </div>
                    )}
                    {!isBoth && isOptimalTarget && (
                      <div className="spectrum-pin pin-optimal" title="Optimal target memory">
                        <span className="pin-pill">🎯 Optimal: {tierLabel}</span>
                        <div className="pin-pointer" />
                      </div>
                    )}
                    {!isBoth && isUserChoice && (
                      <div className="spectrum-pin pin-user" title="Your auxiliary memory">
                        <span className="pin-pill">Your Code: {tierLabel}</span>
                        <div className="pin-pointer" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="graph-details-row">
            <div className="metric-compare-line">
              <span className="metric-label">Target:</span>
              <strong className="metric-val optimal">{space?.optimal || 'O(1)'}</strong>
              <span className="metric-divider">vs</span>
              <span className="metric-label">Your Code:</span>
              <strong className={`metric-val ${space?.is_optimal ? 'optimal' : 'suboptimal'}`}>
                {space?.user || 'O(1)'}
              </strong>
            </div>
            {space?.summary && <p className="complexity-explanation">{space.summary}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProblemWorkspace({
  problem,
  user,
  theme = 'dark',
  onBack,
  onRequireAuth,
  onOpenAiMentor,
  onProblemSolved
}) {
  const [leftTab, setLeftTab] = useState('description') // 'description' | 'ai-helper' | 'editorial' | 'submissions'
  const [consoleTab, setConsoleTab] = useState('testcase') // 'testcase' | 'result'
  const [activeCaseIndex, setActiveCaseIndex] = useState(0)
  const [activeResultCaseIndex, setActiveResultCaseIndex] = useState(0)

  const [userCode, setUserCode] = useState(problem?.starter_code || '# Write your Python solution here\n')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState(null)

  // Directly Integrated AI Socratic Helper State
  const [aiChatMessages, setAiChatMessages] = useState([
    {
      sender: 'ai',
      text: `Hey! I'm your AI assistant for this problem. Feel free to ask questions, brainstorm approaches, or ask for hints or code reviews whenever you need.`
    }
  ])
  const [aiInputText, setAiInputText] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  const handleSendAiMessage = async (overridePrompt, intent = 'chat', executionContextOverride = null) => {
    const messageToSend = overridePrompt || aiInputText
    if (!messageToSend.trim()) return

    const newMessages = [...aiChatMessages, { sender: 'user', text: messageToSend }]
    setAiChatMessages(newMessages)
    setAiInputText('')
    setIsAiLoading(true)

    const historyPayload = newMessages
      .filter((m) => m.sender === 'user' || m.sender === 'ai')
      .slice(1)
      .map((m) => ({ role: m.sender === 'ai' ? 'assistant' : 'user', content: m.text }))

    const execContext = executionContextOverride || (intent === 'diagnose' && executionResult ? {
      status: executionResult.status,
      error_message: executionResult.error_message,
      failed_case: executionResult.details?.[activeResultCaseIndex] || executionResult.details?.find(d => !d.passed) || null
    } : null)

    try {
      const res = await api.post('/ai/assist', {
        problem_title: problem?.title || 'Algorithm Problem',
        problem_description: problem?.description || '',
        user_code: userCode || '',
        action: intent,
        custom_query: messageToSend,
        messages: historyPayload,
        execution_context: execContext
      })
      if (res.data?.response) {
        setAiChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.data.response,
            counter_example: res.data.counter_example || null
          }
        ])
      }
    } catch (err) {
      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `I had trouble connecting to the inference engine. (${err.response?.data?.detail || err.message})`
        }
      ])
    } finally {
      setIsAiLoading(false)
    }
  }

  // Submissions history
  const [submissions, setSubmissions] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Interactive & Editable Test Cases State
  const [customTestCases, setCustomTestCases] = useState([])

  useEffect(() => {
    if (!problem) return
    const initial = []
    if (problem.sample_input) {
      initial.push({
        id: 'sample-1',
        name: 'Case 1',
        input: problem.sample_input,
        expected: problem.sample_output || '',
        isCustom: false
      })
    }
    if (problem.hidden_test_cases && Array.isArray(problem.hidden_test_cases)) {
      problem.hidden_test_cases.slice(0, 2).forEach((tc, idx) => {
        initial.push({
          id: `sample-${idx + 2}`,
          name: `Case ${idx + 2}`,
          input: tc.input,
          expected: tc.expected_output || '',
          isCustom: false
        })
      })
    }
    if (initial.length === 0) {
      initial.push({
        id: 'case-1',
        name: 'Case 1',
        input: '',
        expected: '',
        isCustom: false
      })
    }
    setCustomTestCases(initial)
    setActiveCaseIndex(0)
  }, [problem?.id])

  const handleAddCustomCase = () => {
    const nextNum = customTestCases.length + 1
    const newCase = {
      id: `custom-${Date.now()}`,
      name: `Case ${nextNum}`,
      input: customTestCases[0]?.input || '',
      expected: '',
      isCustom: true
    }
    const updated = [...customTestCases, newCase]
    setCustomTestCases(updated)
    setActiveCaseIndex(updated.length - 1)
  }

  const handleDeleteCase = (idxToDelete, e) => {
    e.stopPropagation()
    if (customTestCases.length <= 1) return
    const updated = customTestCases.filter((_, i) => i !== idxToDelete)
    setCustomTestCases(updated)
    if (activeCaseIndex >= updated.length) {
      setActiveCaseIndex(Math.max(0, updated.length - 1))
    }
  }

  const handleUpdateCurrentCase = (field, val) => {
    setCustomTestCases((prev) => {
      const copy = [...prev]
      if (copy[activeCaseIndex]) {
        copy[activeCaseIndex] = {
          ...copy[activeCaseIndex],
          [field]: val
        }
      }
      return copy
    })
  }

  const loadSubmissions = async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get(`/submissions/history/${problem.id}`)
      setSubmissions(res.data)
    } catch (err) {
      console.error('Failed to load submissions:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (leftTab === 'submissions' && user) {
      loadSubmissions()
    }
  }, [leftTab, user])

  const handleResetCode = () => {
    if (confirm('Reset to starter code? Your current edits will be lost.')) {
      setUserCode(problem?.starter_code || '# Write your Python solution here\n')
    }
  }

  const handleRun = async () => {
    setIsRunning(true)
    setConsoleTab('result')
    setExecutionResult(null)
    setActiveResultCaseIndex(0)
    try {
      const payload = {
        problem_id: problem.id,
        code: userCode,
        language: 'python',
        custom_test_cases: customTestCases.map(tc => ({
          input: tc.input,
          expected_output: tc.expected || ''
        }))
      }
      const res = await api.post('/submissions/run', payload)
      setExecutionResult(res.data)
    } catch (err) {
      setExecutionResult({
        status: 'Runtime Error',
        error_message: err.response?.data?.detail || err.message
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      onRequireAuth()
      return
    }
    setIsSubmitting(true)
    setConsoleTab('result')
    setExecutionResult(null)
    setActiveResultCaseIndex(0)
    try {
      const res = await api.post('/submissions/submit', {
        problem_id: problem.id,
        code: userCode,
        language: 'python'
      })
      setExecutionResult(res.data)
      if (res.data?.status === 'Accepted') {
        onProblemSolved?.(problem.id)
      }
    } catch (err) {
      setExecutionResult({
        status: 'Submission Error',
        error_message: err.response?.data?.detail || err.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="ide-workspace-container" id="ide-workspace">
      {/* Top IDE Navigation Header */}
      <header className="ide-header">
        <div className="ide-header-left">
          <button className="ide-back-btn" onClick={onBack} title="Back to Problems">
            ← Problemset
          </button>
          <div className="ide-divider" />
          <h1 className="ide-problem-title">
            #{problem?.id} {problem?.title}
          </h1>
          <span className={`difficulty-badge ${problem?.difficulty?.toLowerCase()}`}>
            {problem?.difficulty}
          </span>
        </div>

        <div className="ide-header-right">
          <div className="ide-lang-pill">
            <span>🐍</span> Python 3
          </div>
          <button className="ide-reset-btn" onClick={handleResetCode} title="Reset starter code">
            ↺ Reset
          </button>
          <button
            className="ide-btn-mentor"
            id="btn-trigger-ai-mentor"
            onClick={() => onOpenAiMentor?.(userCode)}
          >
            ✨ Ask AI Mentor
          </button>
          <button
            className="ide-btn-run"
            id="btn-run-code"
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
          >
            {isRunning ? 'Running...' : 'Run Test ▶'}
          </button>
          <button
            className="ide-btn-submit"
            id="btn-submit-solution"
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
          >
            {isSubmitting ? 'Evaluating...' : 'Submit 🚀'}
          </button>
        </div>
      </header>

      {/* Main Split-Screen Layout */}
      <div className="ide-split-grid">
        {/* Left Panel: Problem Specifications */}
        <div className="ide-left-pane">
          <div className="ide-pane-tabs">
            <button
              className={`ide-tab ${leftTab === 'description' ? 'active' : ''}`}
              onClick={() => setLeftTab('description')}
            >
              📄 Description
            </button>
            <button
              className={`ide-tab ${leftTab === 'ai-helper' ? 'active' : ''} ide-tab-ai`}
              onClick={() => setLeftTab('ai-helper')}
            >
              🤖 AI Helper
            </button>
            <button
              className={`ide-tab ${leftTab === 'editorial' ? 'active' : ''}`}
              onClick={() => setLeftTab('editorial')}
            >
              💡 Editorial
            </button>
            <button
              className={`ide-tab ${leftTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setLeftTab('submissions')}
            >
              📜 Submissions
            </button>
          </div>

          <div className="ide-pane-body">
            {leftTab === 'description' && (
              <div className="problem-description-content">
                <div className="desc-text">{problem?.description}</div>

                {/* Example 1 */}
                {problem?.sample_input && (
                  <div className="spec-card">
                    <div className="spec-card-title">Example 1:</div>
                    <div className="spec-row">
                      <span className="spec-label">Input:</span>
                      <code className="spec-code">{problem.sample_input}</code>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Output:</span>
                      <code className="spec-code">{problem.sample_output}</code>
                    </div>
                  </div>
                )}

                {/* Example 2 (from hidden test case if present) */}
                {problem?.hidden_test_cases?.[0] && (
                  <div className="spec-card">
                    <div className="spec-card-title">Example 2:</div>
                    <div className="spec-row">
                      <span className="spec-label">Input:</span>
                      <code className="spec-code">{problem.hidden_test_cases[0].input}</code>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Output:</span>
                      <code className="spec-code">{problem.hidden_test_cases[0].expected_output}</code>
                    </div>
                  </div>
                )}

                {/* Constraints Box */}
                <div className="constraints-card">
                  <div className="constraints-title">Constraints & Notes:</div>
                  <ul className="constraints-list">
                    <li>Only one valid answer exists.</li>
                    <li>Solutions are evaluated in a sandboxed Python 3.12 environment with a 3-second timeout.</li>
                    <li>Avoid exponential brute force approaches where $O(N)$ or $O(N \log N)$ is feasible.</li>
                  </ul>
                </div>

              </div>
            )}

            {/* Directly Integrated AI Helper Panel */}
            {leftTab === 'ai-helper' && (
              <div className="workspace-ai-panel">
                <div className="workspace-ai-header">
                  <div className="ai-coach-info">
                    <span className="coach-avatar">✦</span>
                    <div>
                      <h4 className="coach-title">CodeMentor Socratic AI</h4>
                      <span className="coach-sub">Live context of your Monaco code</span>
                    </div>
                  </div>
                  <button
                    className="btn-clear-ai"
                    onClick={() => setAiChatMessages([aiChatMessages[0]])}
                    title="Reset conversation"
                  >
                    Reset
                  </button>
                </div>

                {/* Quick Socratic Prompt Buttons */}
                <div className="workspace-ai-quick-actions">
                  <button
                    className="quick-chip chip-fuzz"
                    onClick={() => handleSendAiMessage("Inspect my current code and find an adversarial counter-example or tricky edge case where my logic will fail.", "fuzz")}
                  >
                    ⚡ Fuzz (Find Counter-Example)
                  </button>
                  {executionResult && (executionResult.status !== 'Accepted' || executionResult.error_message) && (
                    <button
                      className="quick-chip chip-diagnose"
                      onClick={() => handleSendAiMessage("Can you diagnose why my code failed on this execution and explain where it broke?", "diagnose")}
                    >
                      🔍 Diagnose Failure
                    </button>
                  )}
                  <button
                    className="quick-chip"
                    onClick={() => handleSendAiMessage("Can you give me a subtle hint without spoiling the code?", "hint")}
                  >
                    💡 Hint (No Spoilers)
                  </button>
                  <button
                    className="quick-chip"
                    onClick={() => handleSendAiMessage("What is the Big-O time and space complexity of my current code?", "complexity")}
                  >
                    ⏱️ Big-O Check
                  </button>
                  <button
                    className="quick-chip"
                    onClick={() => handleSendAiMessage("Can you inspect my current code and tell me if there is a logical bug or edge case I missed?", "debug")}
                  >
                    🐛 Debug My Code
                  </button>
                  <button
                    className="quick-chip"
                    onClick={() => handleSendAiMessage("What edge cases should I test against?", "edge_cases")}
                  >
                    🔍 Edge Cases
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="workspace-ai-messages">
                  {aiChatMessages.map((msg, i) => (
                    <div key={i} className={`ai-msg-bubble ${msg.sender}`}>
                      <div className="msg-author">{msg.sender === 'ai' ? '🤖 CodeMentor AI' : '👤 You'}</div>
                      <div className="msg-text">{msg.text}</div>
                      {msg.counter_example && (
                        <div className="fuzzer-card">
                          <div className="fuzzer-card-header">
                            <span className="fuzzer-icon">⚡</span>
                            <span className="fuzzer-title">Counter-Example Found</span>
                          </div>
                          <div className="fuzzer-field">
                            <span className="fuzzer-label">Input:</span>
                            <code className="fuzzer-code">{msg.counter_example.input}</code>
                          </div>
                          {msg.counter_example.expected && (
                            <div className="fuzzer-field">
                              <span className="fuzzer-label">Expected:</span>
                              <code className="fuzzer-code">{msg.counter_example.expected}</code>
                            </div>
                          )}
                          {msg.counter_example.explanation && (
                            <p className="fuzzer-explanation">{msg.counter_example.explanation}</p>
                          )}
                          <button
                            className="btn-add-fuzz-case"
                            onClick={() => {
                              const newCase = {
                                id: `fuzz-${Date.now()}`,
                                name: `Fuzz ${customTestCases.length + 1}`,
                                input: msg.counter_example.input,
                                expected: msg.counter_example.expected || '',
                                isCustom: true
                              }
                              setCustomTestCases((prev) => [...prev, newCase])
                              setActiveCaseIndex(customTestCases.length)
                              setConsoleTab('testcase')
                            }}
                          >
                            📥 Add as Testcase & Test Now
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="ai-msg-bubble ai thinking">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-label">Analyzing your code with Socratic AI...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="workspace-ai-input-row">
                  <input
                    type="text"
                    className="workspace-ai-input"
                    placeholder="Ask AI Mentor about this problem or your code..."
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendAiMessage()
                      }
                    }}
                  />
                  <button
                    className="btn-send-ai"
                    disabled={!aiInputText.trim() || isAiLoading}
                    onClick={() => handleSendAiMessage()}
                  >
                    Send →
                  </button>
                </div>
              </div>
            )}

            {leftTab === 'editorial' && (
              <div className="problem-editorial-content">
                <div className="editorial-callout">
                  <div className="editorial-badge">Optimal Strategy</div>
                  <h3>Algorithmic Pattern & Intuition</h3>
                  <p>
                    For problems involving <strong>{problem?.topics?.join(', ')}</strong>, the most optimal solution typically utilizes a hash table or two pointers to achieve linear <code>O(N)</code> runtime.
                  </p>
                </div>
                <div className="editorial-stats">
                  <div className="metric-box">
                    <span className="metric-name">Time Complexity</span>
                    <span className="metric-val">O(N)</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-name">Space Complexity</span>
                    <span className="metric-val">O(N)</span>
                  </div>
                </div>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button className="btn-open-mentor-link" onClick={() => onOpenAiMentor?.(userCode)}>
                    ✨ Ask CodeMentor AI for Step-by-Step Breakdown →
                  </button>
                </div>
              </div>
            )}

            {leftTab === 'submissions' && (
              <div className="problem-submissions-content">
                {!user ? (
                  <div className="sub-login-prompt">
                    <p>Log in to track and view your past submission attempts.</p>
                  </div>
                ) : historyLoading ? (
                  <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px' }}>Loading past submissions...</p>
                ) : submissions.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px' }}>No submissions yet. Submit your solution to record your progress!</p>
                ) : (
                  <table className="sub-history-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Passed</th>
                        <th>Runtime</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr key={sub.id}>
                          <td>
                            <span className={`status-tag ${sub.status === 'Accepted' ? 'accepted' : 'failed'}`}>
                              {sub.status}
                            </span>
                          </td>
                          <td>{sub.passed_cases}/{sub.total_cases}</td>
                          <td>{sub.execution_time_ms}ms</td>
                          <td>{new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Code Editor & Test Runner */}
        <div className="ide-right-pane">
          {/* Top: Code Editor with Monaco */}
          <div className="ide-editor-container">
            <div className="editor-top-bar">
              <div className="editor-file-info">
                <span className="editor-tab-title">🐍 solution.py</span>
                <span className="editor-lang-badge">Python 3.12</span>
              </div>
              <span className="editor-autosave-tag">⚡ Monaco Editor (VS Code)</span>
            </div>
            <div className="monaco-wrapper">
              <Editor
                height="100%"
                language="python"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={userCode}
                onChange={(newVal) => setUserCode(newVal || '')}
                loading={
                  <div className="monaco-loading-placeholder">
                    <span>⚡ Initializing VS Code Editor...</span>
                  </div>
                }
                options={{
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                  fontLigatures: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  insertSpaces: true,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  },
                  padding: { top: 12, bottom: 12 },
                  suggestOnTriggerCharacters: true,
                  bracketPairColorization: { enabled: true },
                  fixedOverflowWidgets: true
                }}
              />
            </div>
          </div>

          {/* Bottom: Interactive Test Console */}
          <div className="ide-console-container">
            <div className="console-tabs-bar">
              <div className="console-left-tabs">
                <button
                  className={`console-tab ${consoleTab === 'testcase' ? 'active' : ''}`}
                  onClick={() => setConsoleTab('testcase')}
                >
                  📥 Testcases
                </button>
                <button
                  className={`console-tab ${consoleTab === 'result' ? 'active' : ''}`}
                  onClick={() => setConsoleTab('result')}
                >
                  📊 Test Result {executionResult && `(${executionResult.status})`}
                </button>
              </div>

              {consoleTab === 'testcase' && customTestCases.length > 0 && (
                <div className="case-chips-bar">
                  {customTestCases.map((tc, idx) => (
                    <button
                      key={tc.id}
                      className={`case-chip ${activeCaseIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveCaseIndex(idx)}
                    >
                      {tc.name}
                      {customTestCases.length > 1 && (
                        <span
                          className="chip-delete-btn"
                          title="Delete testcase"
                          onClick={(e) => handleDeleteCase(idx, e)}
                        >
                          ✕
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    className="case-chip chip-add-btn"
                    onClick={handleAddCustomCase}
                    title="Add new custom testcase"
                  >
                    + Add Case
                  </button>
                  <button
                    className="case-chip chip-fuzz-btn"
                    onClick={() => {
                      setLeftTab('ai-helper')
                      handleSendAiMessage(
                        'Inspect my current code and find a tricky counter-example or edge case where it will fail.',
                        'fuzz'
                      )
                    }}
                    title="Ask AI to find an edge-case counter-example"
                  >
                    ⚡ AI Fuzz (Find Flaw)
                  </button>
                </div>
              )}

              {consoleTab === 'result' && executionResult?.details && executionResult.details.length > 0 && (
                <div className="case-chips-bar">
                  {executionResult.details.map((tc, idx) => (
                    <button
                      key={tc.test_case}
                      className={`case-chip ${tc.passed ? 'chip-pass' : 'chip-fail'} ${activeResultCaseIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveResultCaseIndex(idx)}
                    >
                      {tc.passed ? '✓' : '✗'} Case {tc.test_case}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="console-body">
              {consoleTab === 'testcase' ? (
                <div className="testcase-view">
                  {customTestCases[activeCaseIndex] ? (
                    <div className="tc-input-block">
                      <div className="tc-header-actions">
                        <div className="tc-field-label">Input arguments:</div>
                        <span className="tc-edit-badge">✎ Editable</span>
                      </div>
                      <textarea
                        className="tc-field-textarea"
                        rows={2}
                        value={customTestCases[activeCaseIndex].input}
                        onChange={(e) => handleUpdateCurrentCase('input', e.target.value)}
                        placeholder="e.g. [2, 7, 11, 15], 9"
                      />
                      <div className="tc-header-actions" style={{ marginTop: '12px' }}>
                        <div className="tc-field-label">Expected return (optional):</div>
                      </div>
                      <input
                        type="text"
                        className="tc-field-input"
                        value={customTestCases[activeCaseIndex].expected}
                        onChange={(e) => handleUpdateCurrentCase('expected', e.target.value)}
                        placeholder="e.g. [0, 1] (optional for custom check)"
                      />
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-dim)' }}>No testcases configured for this challenge.</p>
                  )}
                </div>
              ) : (
                <div className="testresult-view">
                  {isRunning || isSubmitting ? (
                    <div className="executing-spinner">
                      <span className="spinner-icon">⚡</span> Evaluating your Python code against testcases...
                    </div>
                  ) : executionResult ? (
                    <div className="verdict-card">
                      <div className="verdict-banner">
                        <span className={`status-tag ${executionResult.status === 'Accepted' ? 'accepted' : 'failed'}`}>
                          {executionResult.status === 'Accepted' ? '✓ Accepted' : `✗ ${executionResult.status}`}
                        </span>
                        <span className="runtime-metric">
                          ⏱ {executionResult.execution_time_ms || 0} ms
                        </span>
                        <span className="pass-rate-metric">
                          Passed: {executionResult.passed_count || 0}/{executionResult.total_count || 0}
                        </span>
                      </div>

                      {/* Dual Time & Space Asymptotic Complexity Benchmark Graphs */}
                      {executionResult.complexity_analysis && (
                        <ComplexityBenchmarkCard analysis={executionResult.complexity_analysis} />
                      )}

                      {executionResult.error_message && (
                        <div className="error-alert">
                          <div>⚠️ {executionResult.error_message}</div>
                          <button
                            className="btn-diagnose-error"
                            onClick={() => {
                              setLeftTab('ai-helper')
                              handleSendAiMessage(
                                `Diagnose my execution error: ${executionResult.error_message}`,
                                'diagnose',
                                {
                                  status: executionResult.status,
                                  error_message: executionResult.error_message,
                                  failed_case: executionResult.details?.[activeResultCaseIndex] || null
                                }
                              )
                            }}
                          >
                            🔍 Diagnose Error with AI
                          </button>
                        </div>
                      )}

                      {executionResult.details && executionResult.details[activeResultCaseIndex] ? (
                        <div className="tc-interactive-diff">
                          <div className="diff-header-row">
                            <span className="diff-case-title">
                              Test Case {executionResult.details[activeResultCaseIndex].test_case}
                            </span>
                            <span className={executionResult.details[activeResultCaseIndex].passed ? 'tc-pass-badge' : 'tc-fail-badge'}>
                              {executionResult.details[activeResultCaseIndex].passed ? '✓ Output Matches Expected' : '✗ Output Mismatch'}
                            </span>
                          </div>

                          <div className="diff-section">
                            <div className="diff-label">Input:</div>
                            <pre className="diff-code-box">{executionResult.details[activeResultCaseIndex].input}</pre>
                          </div>

                          <div className="diff-compare-grid">
                            <div className="diff-box expected-box">
                              <div className="diff-label">Expected Output:</div>
                              <pre className="diff-code-box expected-code">
                                {executionResult.details[activeResultCaseIndex].expected || '(Not specified)'}
                              </pre>
                            </div>
                            <div className="diff-box actual-box">
                              <div className="diff-label">Your Output:</div>
                              <pre className={`diff-code-box ${executionResult.details[activeResultCaseIndex].passed ? 'actual-pass-code' : 'actual-fail-code'}`}>
                                {executionResult.details[activeResultCaseIndex].actual || executionResult.details[activeResultCaseIndex].error || '(No output returned)'}
                              </pre>
                            </div>
                          </div>

                          {executionResult.details[activeResultCaseIndex].stdout && (
                            <div className="diff-section" style={{ marginTop: '12px' }}>
                              <div className="diff-label">Stdout (print logs):</div>
                              <pre className="diff-code-box diff-stdout-box">
                                {executionResult.details[activeResultCaseIndex].stdout}
                              </pre>
                            </div>
                          )}

                          {!executionResult.details[activeResultCaseIndex].passed && (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                className="btn-add-as-testcase"
                                onClick={() => {
                                  const tc = executionResult.details[activeResultCaseIndex]
                                  const newCase = {
                                    id: `imported-${Date.now()}`,
                                    name: `Case ${customTestCases.length + 1}`,
                                    input: tc.input,
                                    expected: tc.expected || '',
                                    isCustom: true
                                  }
                                  setCustomTestCases((prev) => [...prev, newCase])
                                  setActiveCaseIndex(customTestCases.length)
                                  setConsoleTab('testcase')
                                }}
                              >
                                📥 Add this failed case to Testcases tab
                              </button>
                              <button
                                className="btn-diagnose-failure"
                                id="btn-diagnose-failure"
                                onClick={() => {
                                  setLeftTab('ai-helper')
                                  const tc = executionResult.details[activeResultCaseIndex]
                                  const prompt = `Diagnose why my code failed on Test Case ${tc.test_case} (Input: ${tc.input}, Expected: ${tc.expected || 'N/A'}, Actual: ${tc.actual || tc.error || 'N/A'}). Pinpoint the bug.`
                                  handleSendAiMessage(prompt, 'diagnose', {
                                    status: executionResult.status,
                                    error_message: executionResult.error_message,
                                    failed_case: tc
                                  })
                                }}
                              >
                                🔍 Diagnose This Failure with AI →
                              </button>
                            </div>
                          )}
                        </div>
                      ) : executionResult.details && executionResult.details.length > 0 ? (
                        <div className="tc-detail-list">
                          {executionResult.details.map((tc) => (
                            <div key={tc.test_case} className="tc-detail-row">
                              <div className="tc-detail-title">
                                <span>Case {tc.test_case}</span>
                                <span className={tc.passed ? 'tc-pass-badge' : 'tc-fail-badge'}>
                                  {tc.passed ? '✓ Passed' : '✗ Failed'}
                                </span>
                              </div>
                              <div className="tc-diff-grid">
                                <div><strong>Input:</strong> <code>{tc.input}</code></div>
                                <div><strong>Expected:</strong> <code>{tc.expected}</code></div>
                                <div><strong>Actual:</strong> <code className={tc.passed ? 'actual-pass' : 'actual-fail'}>{tc.actual || tc.error}</code></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="empty-console-msg">
                      Click <strong>"Run Test ▶"</strong> to execute your code or <strong>"Submit 🚀"</strong> to evaluate against all test cases.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
