import { useEffect, useState } from 'react'

// The value, once it has stopped changing for `delay` ms: typing a search
// asks the API once at the end instead of once per letter
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return settled
}
