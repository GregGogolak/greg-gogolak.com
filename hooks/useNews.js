'use client'
/**
 * useNews — polls /api/news every 15 minutes.
 *
 * Returns:
 *   articles — [{ id, headline, summary, url, source, datetime, bucket: 'A'|'B'|'C' }]
 *   loading  — true until first successful fetch
 *
 * Bucket key: A = Noise, B = Thesis Support, C = Thesis Risk (see lib/newsClassifier.js)
 */
import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL = 15 * 60_000  // news changes slowly; matches server-side TTL of 14min

export function useNews() {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const timer = useRef(null)

  async function fetchNews() {
    try {
      const json = await fetch('/api/news').then(r => r.json())
      if (json.articles) setArticles(json.articles)
    } catch (e) {
      console.error('[useNews]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
    timer.current = setInterval(fetchNews, POLL_INTERVAL)
    return () => clearInterval(timer.current)
  }, [])

  return { articles, loading }
}
