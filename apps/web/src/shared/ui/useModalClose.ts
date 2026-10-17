import { useCallback, useState } from 'react'
import { canAnimate } from '@/shared/lib/motion'

/**
 * Closing with an exit animation: `requestClose` starts it; pass `closing` and
 * `closed` to the Modal, which calls `closed` (and so `onClose`) once it has
 * played. Where nothing animates it closes at once.
 */
export function useModalClose(onClose: () => void) {
  const [closing, setClosing] = useState(false)
  const closed = useCallback(() => {
    setClosing(false)
    onClose()
  }, [onClose])
  const requestClose = useCallback(() => {
    if (canAnimate()) setClosing(true)
    else closed()
  }, [closed])
  return { closing, requestClose, closed }
}
