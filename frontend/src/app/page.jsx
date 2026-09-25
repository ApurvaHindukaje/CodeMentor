'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Navbar } from '../features/navbar'
import { AuthModal } from '../features/auth'
import { ProblemCatalog, ProblemWorkspace } from '../features/problems'
import { AIMentorDrawer } from '../features/ai-mentor'
import api from '../api'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  
  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState('dark')

  // Problems State
  const [problems, setProblems] = useState([])
  const [loadingProblems, setLoadingProblems] = useState(true)
  const [problemsError, setProblemsError] = useState(null)
  const [activeProblem, setActiveProblem] = useState(null)
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set())

  // AI Mentor Drawer State (as fallback or expanded view)
  const [isAiMentorOpen, setIsAiMentorOpen] = useState(false)
  const [activeCode, setActiveCode] = useState('')

  const fetchProblems = useCallback(async (retries = 3, delayMs = 1200) => {
    // Only display full loading state if we have no problems cached yet
    setLoadingProblems((prev) => (problems.length === 0 ? true : prev))
    setProblemsError(null)

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await api.get('/problems/')
        if (Array.isArray(res.data) && res.data.length > 0) {
          setProblems(res.data)
          setProblemsError(null)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('cm_cached_problems', JSON.stringify(res.data))
            } catch {
              // ignore quota
            }
          }
          setLoadingProblems(false)
          return
        } else if (Array.isArray(res.data) && res.data.length === 0) {
          // If the backend is still initializing/empty, retry briefly
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, delayMs))
            continue
          }
          setProblems([])
          setLoadingProblems(false)
          return
        }
      } catch (err) {
        console.warn(`[CodeMentor] Problem fetch attempt ${attempt}/${retries} failed:`, err.message || err)
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * attempt))
        } else {
          console.error('Failed to load problems after all retries:', err)
          setProblemsError('Unable to connect to the backend server. Please verify PostgreSQL and backend service are running.')
        }
      }
    }
    setLoadingProblems(false)
  }, [problems.length])

  // Fetch solved problems strictly scoped to the active user
  const fetchUserSolved = useCallback(async (targetUser) => {
    if (!targetUser?.id) {
      setSolvedProblemIds(new Set())
      return
    }

    const storageKey = `cm_solved_${targetUser.id}`

    // 1. Instantly read user-scoped cache for zero flicker
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(storageKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) {
            setSolvedProblemIds(new Set(parsed))
          }
        } else {
          setSolvedProblemIds(new Set())
        }
      } catch {
        // ignore
      }
    }

    // 2. Fetch ground-truth solved problems from backend PostgreSQL database
    try {
      const res = await api.get('/submissions/solved')
      if (Array.isArray(res.data)) {
        const freshSet = new Set(res.data)
        setSolvedProblemIds(freshSet)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(res.data))
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn('[CodeMentor] Could not fetch user solved problems:', err.message || err)
    }
  }, [])

  // Sync user progress whenever active user changes
  useEffect(() => {
    fetchUserSolved(user)
  }, [user, fetchUserSolved])

  useEffect(() => {
    // Proactively warm up backend server in background on initial page visit
    api.get('/').catch(() => {})

    // Check saved session and theme in localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('cm_theme') || 'dark'
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)

      const savedUser = localStorage.getItem('cm_user')
      const token = localStorage.getItem('cm_token')
      
      // Clean up legacy unscoped storage key if present
      localStorage.removeItem('cm_solved')

      // Check cached problems for instantaneous rendering
      const cachedProblems = localStorage.getItem('cm_cached_problems')
      if (cachedProblems) {
        try {
          const parsed = JSON.parse(cachedProblems)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProblems(parsed)
            setLoadingProblems(false)
          }
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
  }, [fetchProblems])

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cm_theme', nextTheme)
      document.documentElement.setAttribute('data-theme', nextTheme)
    }
  }

  const handleSelectProblem = async (problem) => {
    if (!problem) return

    // Immediately open the workspace with optimistic state so user never experiences an unresponsive click
    const initialWorkspaceProblem = {
      id: problem.id,
      title: problem.title || 'Algorithm Problem',
      description: problem.description || 'Loading problem details...',
      difficulty: problem.difficulty || 'Medium',
      topics: problem.topics || [],
      sample_input: problem.sample_input || '',
      sample_output: problem.sample_output || '',
      starter_code: problem.starter_code || 'def solution():\n    # Write your solution here\n    pass\n',
      optimal_time_complexity: problem.optimal_time_complexity || 'O(N)',
      optimal_space_complexity: problem.optimal_space_complexity || 'O(1)',
      complexity_notes: problem.complexity_notes || ''
    }

    setActiveProblem(initialWorkspaceProblem)
    setActiveCode(initialWorkspaceProblem.starter_code)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // In parallel, fetch full problem details (sample input/output, starter code, test cases) from backend
    try {
      const res = await api.get(`/problems/${problem.id}`)
      if (res.data) {
        setActiveProblem(res.data)
        if (res.data.starter_code) {
          setActiveCode(res.data.starter_code)
        }
      }
    } catch (err) {
      console.warn('[CodeMentor] Could not fetch detailed problem data from backend, using catalog data:', err.message || err)
    }
  }

  const handlePickRandom = () => {
    if (problems && problems.length > 0) {
      const randomProb = problems[Math.floor(Math.random() * problems.length)]
      handleSelectProblem(randomProb)
    } else {
      // Fallback if catalog is still loading
      handleSelectProblem({
        id: 1,
        title: 'Two Sum',
        difficulty: 'Easy',
        topics: ['Array', 'Hash Table'],
        starter_code: 'def twoSum(nums, target):\n    # Write your solution here\n    pass\n'
      })
    }
  }

  const handleProblemSolved = (problemId) => {
    setSolvedProblemIds((prev) => {
      const updated = new Set(prev)
      updated.add(problemId)
      if (typeof window !== 'undefined' && user?.id) {
        try {
          localStorage.setItem(`cm_solved_${user.id}`, JSON.stringify(Array.from(updated)))
        } catch {
          // ignore
        }
      }
      return updated
    })
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cm_token')
      localStorage.removeItem('cm_user')
      localStorage.removeItem('cm_solved')
    }
    setUser(null)
    setSolvedProblemIds(new Set())
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
          error={problemsError}
          onRetry={fetchProblems}
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
