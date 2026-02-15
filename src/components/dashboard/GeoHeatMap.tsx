'use client'

import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useState } from 'react'
import { scaleQuantize } from 'd3-scale'

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface StateData {
  stateName: string
  stateCode: string
  regulationCount: number
  totalCost: number
  topRegulationType: string
}

interface Props {
  data: StateData[]
  onStateClick?: (stateCode: string) => void
  isLoading?: boolean
}

// US state codes for reference
const STATE_CODES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
}

const CONTINENTAL_STATES = Object.keys(STATE_CODES).filter(code => code !== 'AK' && code !== 'HI')

export default function GeoHeatMap({ data, onStateClick, isLoading = false }: Props) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<StateData | null>(null)

  // Create a map of state codes to data for quick lookup
  const dataMap = new Map(data.map(d => [d.stateCode, d]))

  // Calculate max count for color scaling
  const maxCount = Math.max(...data.map(d => d.regulationCount), 1)

  // D3 color scale
  const colorScale = scaleQuantize<string>()
    .domain([0, maxCount])
    .range(['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1e40af'])

  const getColor = (stateCode: string): string => {
    const stateData = dataMap.get(stateCode)
    if (!stateData) return '#f3f4f6'
    return colorScale(stateData.regulationCount)
  }

  const getRadius = (count: number): number => {
    if (count === 0) return 0
    return 5 + (count / maxCount) * 25
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse h-96 bg-gray-200 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Geographic Heat Map</h3>
          <p className="text-sm text-gray-500">Regulation intensity by state (click to filter)</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium">Regulations:</span>
            {[0, maxCount * 0.25, maxCount * 0.5, maxCount * 0.75, maxCount].map((val, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: colorScale(val)
                  }}
                />
                <span>{Math.round(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full bg-gray-50 rounded border border-gray-200 overflow-hidden">
          <div className="w-full" style={{ minHeight: '500px' }}>
            <ComposableMap projection="geoAlbersUsa">
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const stateName = geo.properties.name
                    const stateCode = Object.entries(STATE_CODES).find(
                      ([_, name]) => name === stateName
                    )?.[0]

                    if (!stateCode || !CONTINENTAL_STATES.includes(stateCode)) {
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: {
                              fill: '#f3f4f6',
                              stroke: '#e5e7eb',
                              strokeWidth: 0.75,
                              outline: 'none',
                              cursor: 'default'
                            },
                            hover: {
                              fill: '#f3f4f6',
                              stroke: '#e5e7eb',
                              strokeWidth: 0.75,
                              outline: 'none'
                            },
                            pressed: {
                              fill: '#f3f4f6',
                              stroke: '#e5e7eb',
                              strokeWidth: 0.75,
                              outline: 'none'
                            }
                          }}
                        />
                      )
                    }

                    const stateData = dataMap.get(stateCode)
                    const isHovered = hoveredState === stateCode

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => {
                          if (stateData && onStateClick) {
                            onStateClick(stateCode)
                          }
                          if (stateData) {
                            setShowDetails(stateData)
                          }
                        }}
                        onMouseEnter={() => setHoveredState(stateCode)}
                        onMouseLeave={() => setHoveredState(null)}
                        style={{
                          default: {
                            fill: getColor(stateCode),
                            stroke: '#e5e7eb',
                            strokeWidth: 0.75,
                            outline: 'none',
                            cursor: stateData && stateData.regulationCount > 0 ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                          },
                          hover: {
                            fill: isHovered ? '#1e40af' : getColor(stateCode),
                            stroke: isHovered ? '#1e3a8a' : '#e5e7eb',
                            strokeWidth: isHovered ? 2 : 0.75,
                            outline: 'none',
                            cursor: stateData && stateData.regulationCount > 0 ? 'pointer' : 'default'
                          },
                          pressed: {
                            fill: '#1e40af',
                            stroke: '#1e3a8a',
                            strokeWidth: 2,
                            outline: 'none'
                          }
                        }}
                      />
                    )
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
        </div>

        {/* State Details Panel */}
        {showDetails && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{showDetails.stateName}</h4>
                <p className="text-xs text-gray-500">{showDetails.stateCode}</p>
              </div>
              <button
                onClick={() => setShowDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-600">Regulations</p>
                <p className="font-semibold text-gray-900">{showDetails.regulationCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Cost</p>
                <p className="font-semibold text-gray-900">
                  ${(showDetails.totalCost / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Top Type</p>
                <p className="font-semibold text-gray-900">{showDetails.topRegulationType}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-200 pt-4">
          <div>
            <p className="text-xs text-gray-500">States with Regs</p>
            <p className="text-lg font-semibold text-gray-900">{data.filter(d => d.regulationCount > 0).length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Regulations</p>
            <p className="text-lg font-semibold text-gray-900">{data.reduce((sum, d) => sum + d.regulationCount, 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Exposure</p>
            <p className="text-lg font-semibold text-gray-900">
              ${(data.reduce((sum, d) => sum + d.totalCost, 0) / 1000000).toFixed(1)}M
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Highest Activity</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.length > 0
                ? data.reduce((max, d) => (d.regulationCount > max.regulationCount ? d : max)).stateCode
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
