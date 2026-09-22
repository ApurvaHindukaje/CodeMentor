'use client'

import React, { useState, useEffect } from 'react'
import { Navbar } from '../features/navbar'
import { AuthModal } from '../features/auth'
import { ProblemCatalog, ProblemWorkspace } from '../features/problems'
import { AIMentorDrawer } from '../features/ai-mentor'
import api from '../api'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  
  // Theme state: 'light' | 'dark'
  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState('dark')

  // Problems State
  const [problems, setProblems] = useState([])
  const [loadingProblems, setLoadingProblems] = useState(true)
  const [activeProblem, setActiveProblem] = useState(null)
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set([1]))

  // AI Mentor Drawer State (as fallback or expanded view)
  const [isAiMentorOpen, setIsAiMentorOpen] = useState(false)
  const [activeCode, setActiveCode] = useState('')

  useEffect(() => {
    // Check saved session and theme in localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('cm_theme') || 'dark'
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)

      const savedUser = localStorage.getItem('cm_user')
      const token = localStorage.getItem('cm_token')
      const savedSolved = localStorage.getItem('cm_solved')
      if (savedSolved) {
        try {
          setSolvedProblemIds(new Set(JSON.parse(savedSolved)))
        } catch {
          // ignore
        }
      }

      if (savedUser && token) {
        try {
          setUser(JSON.parse(savedUser))
          api.get('/me')
            .then((res) => {
              if (res.data?.user) {
                setUser(res.data.user)
              }
            })
            .catch(() => {
              localStorage.removeItem('cm_token')
              localStorage.removeItem('cm_user')
              setUser(null)
            })
        } catch {
          // parse error
        }
      }
    }

    fetchProblems()
  }, [])

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cm_theme', nextTheme)
      document.documentElement.setAttribute('data-theme', nextTheme)
    }
  }

  const fetchProblems = async () => {
    setLoadingProblems(true)
    try {
      const res = await api.get('/problems/')
      setProblems(res.data)
    } catch (err) {
      console.error('Failed to load problems:', err)
    } finally {
      setLoadingProblems(false)
    }
  }

  const handleSelectProblem = async (problem) => {
    try {
      const res = await api.get(`/problems/${problem.id}`)
      setActiveProblem(res.data)
      setActiveCode(res.data.starter_code || '# Write your solution here\n')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Failed to load problem details:', err)
    }
  }

  const handlePickRandom = () => {
    if (problems.length > 0) {
      const randomProb = problems[Math.floor(Math.random() * problems.length)]
      handleSelectProblem(randomProb)
    }
  }

  const handleProblemSolved = (problemId) => {
    setSolvedProblemIds((prev) => {
      const updated = new Set(prev)
      updated.add(problemId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('cm_solved', JSON.stringify(Array.from(updated)))
      }
      return updated
    })
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cm_token')
      localStorage.removeItem('cm_user')
    }
    setUser(null)
  }

  return (
    <main id="codementor-platform-root">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onNavigateProblems={() => setActiveProblem(null)}
        onPickRandom={handlePickRandom}
      />

      {!activeProblem ? (
        <ProblemCatalog
          problems={problems}
          solvedProblemIds={solvedProblemIds}
          onSelectProblem={handleSelectProblem}
          loading={loadingProblems}
        />
      ) : (
        <ProblemWorkspace
          problem={activeProblem}
          user={user}
          theme={theme}
          onBack={() => setActiveProblem(null)}
          onRequireAuth={() => setIsAuthOpen(true)}
          onOpenAiMentor={(code) => {
            if (code) setActiveCode(code)
            setIsAiMentorOpen(true)
          }}
          onProblemSolved={handleProblemSolved}
        />
      )}

      {/* Slide-Over AI Mentor Drawer (available across IDE) */}
      <AIMentorDrawer
        isOpen={isAiMentorOpen}
        onClose={() => setIsAiMentorOpen(false)}
        problem={activeProblem}
        userCode={activeCode}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)}
      />
    </main>
  )
}
