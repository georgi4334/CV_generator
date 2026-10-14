import { Outlet } from 'react-router'
import { PrintHost } from '../features/print/PrintHost'

/** Wraps every page; holds what all pages share, like printing. */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <PrintHost />
    </>
  )
}
