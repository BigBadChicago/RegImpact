'use client'

import { ReactNode, useState, useEffect } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

export interface Widget {
  id: string
  title: string
  component: ReactNode
  defaultLayout?: any
}

interface WidgetGridProps {
  widgets: Widget[]
  onLayoutChange?: (layout: any[]) => void
  savedLayout?: any[]
  templateName?: 'cfo' | 'coo' | 'compliance' | 'custom'
}

const TEMPLATES = {
  cfo: [
    { i: 'cost-waterfall', x: 0, y: 0, w: 6, h: 3, minW: 4, minH: 2 },
    { i: 'forecast', x: 6, y: 0, w: 6, h: 3, minW: 4, minH: 2 },
    { i: 'department-matrix', x: 0, y: 3, w: 12, h: 3, minW: 6, minH: 2 }
  ] as any[],
  coo: [
    { i: 'timeline', x: 0, y: 0, w: 6, h: 3, minW: 4, minH: 2 },
    { i: 'geo-map', x: 6, y: 0, w: 6, h: 3, minW: 4, minH: 2 },
    { i: 'deadlines', x: 0, y: 3, w: 12, h: 2, minW: 6, minH: 2 }
  ] as any[],
  compliance: [
    { i: 'health-score', x: 0, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
    { i: 'deadlines', x: 3, y: 0, w: 9, h: 2, minW: 6, minH: 2 },
    { i: 'activity-feed', x: 0, y: 2, w: 6, h: 3, minW: 4, minH: 2 },
    { i: 'trend-charts', x: 6, y: 2, w: 6, h: 3, minW: 6, minH: 2 }
  ] as any[],
  custom: [] as any[]
}

const DEFAULT_LAYOUT: any[] = [
  { i: 'health-score', x: 0, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
  { i: 'cost-waterfall', x: 3, y: 0, w: 5, h: 2, minW: 4, minH: 2 },
  { i: 'timeline', x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
  { i: 'department-matrix', x: 0, y: 2, w: 6, h: 3, minW: 4, minH: 2 },
  { i: 'trend-charts', x: 6, y: 2, w: 6, h: 3, minW: 6, minH: 2 },
  { i: 'geo-map', x: 0, y: 5, w: 6, h: 3, minW: 4, minH: 2 },
  { i: 'deadlines', x: 6, y: 5, w: 6, h: 2, minW: 6, minH: 2 },
  { i: 'activity-feed', x: 0, y: 7, w: 12, h: 2, minW: 6, minH: 2 }
]

export default function WidgetGrid({
  widgets,
  onLayoutChange,
  savedLayout,
  templateName = 'custom'
}: WidgetGridProps) {
  const [layout, setLayout] = useState<any[]>(DEFAULT_LAYOUT)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Use saved layout or template
  useEffect(() => {
    if (savedLayout) {
      setLayout(savedLayout)
    } else if (templateName && templateName !== 'custom') {
      const templateLayout = TEMPLATES[templateName as keyof typeof TEMPLATES]
      if (templateLayout && templateLayout.length > 0) {
        setLayout(
          templateLayout.map(item => ({
            ...item,
            static: false
          })) as any[]
        )
      }
    }
  }, [savedLayout, templateName])

  // Handle responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLayoutChange = (newLayout: Layout) => {
    const layoutArray = Array.isArray(newLayout) ? newLayout : [newLayout]
    setLayout(layoutArray as any[])
    if (onLayoutChange) {
      onLayoutChange(layoutArray as any[])
    }
  }

  const handleResetToDefault = () => {
    setLayout(DEFAULT_LAYOUT)
    if (onLayoutChange) {
      onLayoutChange(DEFAULT_LAYOUT)
    }
  }

  const handleLoadTemplate = (template: 'cfo' | 'coo' | 'compliance') => {
    const templateLayout = TEMPLATES[template]
    if (templateLayout && templateLayout.length > 0) {
      const newLayout = templateLayout.map(item => ({
        ...item,
        static: false
      })) as any[]
      setLayout(newLayout)
      if (onLayoutChange) {
        onLayoutChange(newLayout)
      }
    }
  }

  // Create widget map for quick lookup
  const widgetMap = new Map(widgets.map(w => [w.id, w]))

  // Mobile: return vertical stack without drag capability
  if (isMobile) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            {isEditMode ? 'Done' : 'Edit'}
          </button>
        </div>
        {layout.map(item => {
          const widget = widgetMap.get(item.i)
          return widget ? (
            <div key={item.i} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
                <h3 className="font-medium text-sm text-gray-900">{widget.title}</h3>
              </div>
              <div className="p-4">{widget.component}</div>
            </div>
          ) : null
        })}
      </div>
    )
  }

  // Desktop: drag-and-drop grid
  return (
    <div className="w-full bg-gray-50 rounded-lg p-4">
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500">
              {isEditMode ? 'Drag widgets to rearrange your dashboard' : 'Click Edit Layout to customize'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Edit mode toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                isEditMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {isEditMode ? 'Done Editing' : 'Edit Layout'}
            </button>

            {/* Template selector */}
            <div className="relative group">
              <button className="px-4 py-2 rounded text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200">
                Load Template ▼
              </button>
              <div className="invisible group-hover:visible absolute right-0 mt-0 w-40 bg-white rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleLoadTemplate('cfo')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  CFO View
                </button>
                <button
                  onClick={() => handleLoadTemplate('coo')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  COO View
                </button>
                <button
                  onClick={() => handleLoadTemplate('compliance')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  Compliance Officer View
                </button>
              </div>
            </div>

            {/* Reset button */}
            <button
              onClick={handleResetToDefault}
              className="px-4 py-2 rounded text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="w-full bg-white rounded-lg shadow">
          <div className="space-y-4 p-6">
            {layout.map(item => {
              const widget = widgetMap.get(item.i)
              return widget ? (
                <div
                  key={item.i}
                  className="bg-white rounded border border-gray-200 overflow-hidden"
                >
                  <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-medium text-sm text-gray-900">{widget.title}</h3>
                    {isEditMode && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Edit mode
                      </span>
                    )}
                  </div>
                  <div className="p-4">{widget.component}</div>
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
