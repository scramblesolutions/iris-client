import { useEffect, useMemo, useState } from "react"

const useCachedFetch = <ReceiveType, ReturnType>(
  url: string,
  storageKey: string,
  dataProcessor?: (data: ReceiveType) => ReturnType
) => {
  const cachedData = useMemo<{ data: ReturnType; timestamp: number }>(() => {
    const cached = localStorage.getItem(storageKey)
    return cached ? JSON.parse(cached) : null
  }, [storageKey])

  const initialData = cachedData ? cachedData.data : null
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(!cachedData)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(undefined)

      try {
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const fetchedData: ReceiveType = await res.json()
        const processedData: ReturnType = dataProcessor
          ? dataProcessor(fetchedData)
          : (fetchedData as unknown as ReturnType)
        setData(processedData)
        localStorage.setItem(
          storageKey,
          JSON.stringify({ data: processedData, timestamp: new Date().getTime() })
        )
      } catch (e) {
        setError(e as Error)
        if (cachedData?.data) {
          setData(cachedData.data)
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedData || (new Date().getTime() - cachedData.timestamp) / 1000 / 60 >= 15) {
      fetchData()
    }
  }, [url, storageKey])

  return { data, isLoading, error }
}

export default useCachedFetch
