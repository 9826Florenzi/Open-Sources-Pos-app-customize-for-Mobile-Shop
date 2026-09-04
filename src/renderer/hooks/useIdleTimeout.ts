import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useNotify } from '../context/AppContext'

export function useIdleTimeout(timeoutMinutes = 10) {
  const timeoutRef = useRef<any>(null)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const notify = useNotify()

  const handleIdle = useCallback(async () => {
    if (!user) return
    try {
      if (window.api && window.api.auth && window.api.auth.logout) await window.api.auth.logout()
    } catch(e) {}
    logout()
    notify.warning('Tự động đăng xuất', 'Phiên làm việc đã hết hạn do không có thao tác.')
    navigate('/login')
  }, [logout, navigate, notify, user])

  const resetTimer = useCallback(() => {
    if (!user) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(handleIdle, timeoutMinutes * 60 * 1000)
  }, [handleIdle, timeoutMinutes, user])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const handleEvent = () => resetTimer()

    events.forEach(e => window.addEventListener(e, handleEvent))
    resetTimer()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      events.forEach(e => window.removeEventListener(e, handleEvent))
    }
  }, [resetTimer])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        lockScreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const lockScreen = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    try {
      if (window.api && window.api.auth && window.api.auth.logout) await window.api.auth.logout()
    } catch(e) {}
    logout()
    navigate('/login')
  }, [logout, navigate])

  return { lockScreen }
}
