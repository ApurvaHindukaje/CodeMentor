'use client'

import React, { useState, useEffect } from 'react'
import api from '../../api'
import { ProblemWorkspace } from './ProblemWorkspace'

export function ProblemsDashboard({ onRequireAuth, user }) {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeProblem, setActiveProblem] = useState(null)

  useEffect(() => {
    fetchProblems()
  }, [])

  const fetchProblems = async () => {
    setLoading(true)
    try {
      const res = await api.get('/problems/')
      setProblems(res.data)
    } catch (err) {
      console.error('Failed to load problems:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectProblem = async (problem) => {
    try {
      const res = await api.get(`/problems/${problem.id}`)
      setActiveProblem(res.data)
      window.scrollTo({ top: 120, behavior: 'smooth' })
    } catch (err) {
      console.error('Failed to load problem details:', err)
    }
  }

  const filteredProblems = problems.filter((p) => {
    const matchesDiff = selectedDifficulty === 'All' || p.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.topics && p.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    return matchesDiff && matchesSearch
  })

  return (
    <section className="problems-section" id="problems-main-container">
      {!activeProblem ? (
        <>
          <div className="hero-banner">
            <div className="hero-tagline">
              <span>🚀</span> Level Up Your Algorithm Skills
            </div>
            <h1 className="hero-title">
              Sharpen Your Coding Skills with <span>CodeMentor AI</span>
            </h1>
            <p className="hero-description">
              Select an algorithm problem below, write your solution in Python, and test your code against curated test cases.
            </p>
          </div>

          <div className="filter-bar" id="problem-filters-bar">
            <div className="difficulty-tabs">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  id={`tab-diff-${diff.toLowerCase()}`}
                  className={`diff-btn ${selectedDifficulty === diff ? 'active' : ''}`}
                  onClick={() => setSelectedDifficulty(diff)}
                >
                  {diff}
                </button>
              ))}
            </div>

            <div className="search-box">
              <span>🔍</span>
              <input
                id="search-problems-input"
                className="search-input"
                type="text"
                placeholder="Search problems or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Loading problems from PostgreSQL...
            </div>
          ) : filteredProblems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              No problems found matching your filters.
            </div>
          ) : (
            <div className="problems-grid" id="problems-cards-grid">
              {filteredProblems.map((prob) => (
                <div
                  key={prob.id}
                  className="problem-card"
                  id={`problem-card-${prob.id}`}
                  onClick={() => handleSelectProblem(prob)}
                >
                  <div>
                    <div className="card-header">
                      <h3 className="card-title">{prob.title}</h3>
                      <span className={`difficulty-badge ${prob.difficulty.toLowerCase()}`}>
                        {prob.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="card-topics">
                    {prob.topics && prob.topics.map((t, idx) => (
                      <span key={idx} className="topic-tag">#{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <ProblemWorkspace
          problem={activeProblem}
          user={user}
          onBack={() => setActiveProblem(null)}
          onRequireAuth={onRequireAuth}
        />
      )}
    </section>
  )
}
