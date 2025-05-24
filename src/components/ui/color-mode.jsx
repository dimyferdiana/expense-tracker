'use client'

import { ClientOnly, IconButton, Skeleton, Span } from '@chakra-ui/react'
import * as React from 'react'
import { LuMoon, LuSun } from 'react-icons/lu'

// Create a simple color mode context for React
const ColorModeContext = React.createContext()

export function ColorModeProvider({ children }) {
  const [colorMode, setColorModeState] = React.useState(() => {
    // Check localStorage for saved preference, default to 'light'
    const saved = localStorage.getItem('chakra-ui-color-mode')
    return saved || 'light'
  })

  // Update document class and localStorage when color mode changes
  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(colorMode)
    localStorage.setItem('chakra-ui-color-mode', colorMode)
  }, [colorMode])

  const setColorMode = React.useCallback((mode) => {
    setColorModeState(mode)
  }, [])

  const toggleColorMode = React.useCallback(() => {
    setColorModeState(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const value = React.useMemo(() => ({
    colorMode,
    setColorMode,
    toggleColorMode,
  }), [colorMode, setColorMode, toggleColorMode])

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  )
}

export function useColorMode() {
  const context = React.useContext(ColorModeContext)
  if (!context) {
    throw new Error('useColorMode must be used within a ColorModeProvider')
  }
  return context
}

export function useColorModeValue(light, dark) {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? dark : light
}

export function ColorModeIcon() {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? <LuMoon /> : <LuSun />
}

export const ColorModeButton = React.forwardRef(
  function ColorModeButton(props, ref) {
    const { toggleColorMode } = useColorMode()
    return (
      <ClientOnly fallback={<Skeleton boxSize='8' />}>
        <IconButton
          onClick={toggleColorMode}
          variant='ghost'
          aria-label='Toggle color mode'
          size='sm'
          ref={ref}
          {...props}
          css={{
            _icon: {
              width: '5',
              height: '5',
            },
          }}
        >
          <ColorModeIcon />
        </IconButton>
      </ClientOnly>
    )
  },
)

export const LightMode = React.forwardRef(function LightMode(props, ref) {
  return (
    <Span
      color='fg'
      display='contents'
      className='chakra-theme light'
      colorPalette='gray'
      colorScheme='light'
      ref={ref}
      {...props}
    />
  )
})

export const DarkMode = React.forwardRef(function DarkMode(props, ref) {
  return (
    <Span
      color='fg'
      display='contents'
      className='chakra-theme dark'
      colorPalette='gray'
      colorScheme='dark'
      ref={ref}
      {...props}
    />
  )
})
