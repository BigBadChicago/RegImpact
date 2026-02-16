declare module 'react-simple-maps' {
  import { FC, ReactNode } from 'react'

  export interface ComposableMapProps {
    projection?: string
    children?: ReactNode
  }

  export interface GeographiesProps {
    geography: string
    children: (props: { geographies: any[] }) => ReactNode
  }

  export interface GeographyProps {
    key?: string
    geography: any
    style?: {
      default?: Record<string, any>
      hover?: Record<string, any>
      pressed?: Record<string, any>
    }
    onClick?: () => void
    onMouseEnter?: () => void
    onMouseLeave?: () => void
  }

  export const ComposableMap: FC<ComposableMapProps>
  export const Geographies: FC<GeographiesProps>
  export const Geography: FC<GeographyProps>
}
