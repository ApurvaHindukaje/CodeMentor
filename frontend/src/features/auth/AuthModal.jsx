'use client'

import React, { useState } from 'react'
import api from '../../api'

export function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
  }

  const switchTab = (toLogin) => {
    setIsLogin(toLogin)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        const response = await api.post('/login', { email, password })
        const { access_token, user } = response.data
        if (typeof window !== 'undefined') {
          localStorage.setItem('cm_token', access_token)
          localStorage.setItem('cm_user', JSON.stringify(user))
        }
        setSuccess('Login successful!')
        setTimeout(() => {
          onAuthSuccess(user)
          onClose()
          resetForm()
        }, 500)
      } else {
        const response = await api.post('/signup', { name, email, password })
        setSuccess(response.data.message || 'Account created successfully! Please log in.')
        setIsLogin(true)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Authentication request failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" id="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" id="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" id="btn-close-auth-modal" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        <div className="auth-tabs" id="auth-tabs-toggle">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            id="tab-btn-login"
            onClick={() => switchTab(true)}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            id="tab-btn-signup"
            onClick={() => switchTab(false)}
          >
            Sign Up
          </button>
        </div>

        <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Enter your credentials to continue your coding journey' : 'Join CodeMentor AI to practice algorithm challenges'}
        </p>

        {error && (
          <div className="auth-alert error" id="auth-error-banner">
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="auth-alert success" id="auth-success-banner">
            <span>✓</span> {success}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} id="auth-credential-form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-name-input">Full Name</label>
              <input
                id="auth-name-input"
                className="form-input"
                type="text"
                placeholder="Apurva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email-input">Email Address</label>
            <input
              id="auth-email-input"
              className="form-input"
              type="email"
              placeholder="developer@codementor.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password-input">Password</label>
            <input
              id="auth-password-input"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-submit"
            id="btn-auth-submit"
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
