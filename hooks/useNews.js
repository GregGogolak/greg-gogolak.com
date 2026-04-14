'use client'
import { useState, useEffect, useRef } from 'react'

const INTERVAL = 900_000  // 15 minutes

export function useNews() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const timer = useRef(null)

  async function fetchNews() {
    try {
      const res  = await fetch('/api/news')
      const json = await res.json()
      if (json.articles) setArticles(json.articles)
    } catch (e) {
      console.error('[useNews]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
    timer.current = setInterval(fetchNews, INTERVAL)
    return () => clearInterval(timer.current)
  }, [])

  return { articles, loading }
}
