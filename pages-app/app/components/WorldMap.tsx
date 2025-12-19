import { useState } from "react";

interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  department?: string;
  location?: string;
  photo_url?: string;
}

interface WorldMapProps {
  employees: Employee[];
  getPhotoUrl: (employee: Employee) => string | null;
}

// City coordinates (latitude, longitude)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // North America
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "Austin": { lat: 30.2672, lng: -97.7431 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "New York": { lat: 40.7128, lng: -74.0060 },
  "New York, NY": { lat: 40.7128, lng: -74.0060 },
  "Seattle": { lat: 47.6062, lng: -122.3321 },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Chicago": { lat: 41.8781, lng: -87.6298 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
  "Boston": { lat: 42.3601, lng: -71.0589 },
  "Boston, MA": { lat: 42.3601, lng: -71.0589 },
  "Toronto": { lat: 43.6532, lng: -79.3832 },
  "Vancouver": { lat: 49.2827, lng: -123.1207 },
  "Mexico City": { lat: 19.4326, lng: -99.1332 },

  // Europe
  "London": { lat: 51.5074, lng: -0.1278 },
  "Paris": { lat: 48.8566, lng: 2.3522 },
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Amsterdam": { lat: 52.3676, lng: 4.9041 },
  "Madrid": { lat: 40.4168, lng: -3.7038 },
  "Rome": { lat: 41.9028, lng: 12.4964 },
  "Munich": { lat: 48.1351, lng: 11.5820 },
  "Lisbon": { lat: 38.7223, lng: -9.1393 },
  "Dublin": { lat: 53.3498, lng: -6.2603 },
  "Stockholm": { lat: 59.3293, lng: 18.0686 },
  "Warsaw": { lat: 52.2297, lng: 21.0122 },

  // Asia Pacific
  "Singapore": { lat: 1.3521, lng: 103.8198 },
  "Tokyo": { lat: 35.6762, lng: 139.6503 },
  "Sydney": { lat: -33.8688, lng: 151.2093 },
  "Melbourne": { lat: -37.8136, lng: 144.9631 },
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Bangalore": { lat: 12.9716, lng: 77.5946 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694 },
  "Seoul": { lat: 37.5665, lng: 126.9780 },
  "Shanghai": { lat: 31.2304, lng: 121.4737 },
  "Beijing": { lat: 39.9042, lng: 116.4074 },
  "Bangkok": { lat: 13.7563, lng: 100.5018 },

  // Middle East & Africa
  "Dubai": { lat: 25.2048, lng: 55.2708 },
  "Tel Aviv": { lat: 32.0853, lng: 34.7818 },
  "Johannesburg": { lat: -26.2041, lng: 28.0473 },
  "Cairo": { lat: 30.0444, lng: 31.2357 },

  // South America
  "São Paulo": { lat: -23.5505, lng: -46.6333 },
  "Buenos Aires": { lat: -34.6037, lng: -58.3816 },
  "Santiago": { lat: -33.4489, lng: -70.6693 },
};

// Convert lat/lng to SVG coordinates
const latLngToSvg = (lat: number, lng: number, width: number, height: number) => {
  // Mercator projection (simplified)
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
  const y = (height / 2) - (width * mercN / (2 * Math.PI));
  return { x, y };
};

export function WorldMap({ employees, getPhotoUrl }: WorldMapProps) {
  const [hoveredEmployee, setHoveredEmployee] = useState<Employee | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const width = 1200;
  const height = 600;

  // Group employees by location
  const employeesByLocation = employees.reduce((acc, emp) => {
    if (emp.location) {
      const location = emp.location.trim();
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(emp);
    }
    return acc;
  }, {} as Record<string, Employee[]>);

  // Get locations that we have coordinates for
  const mappedLocations = Object.keys(employeesByLocation).filter(loc => {
    // Try exact match or partial match
    return CITY_COORDINATES[loc] || Object.keys(CITY_COORDINATES).some(city =>
      loc.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(loc.toLowerCase())
    );
  });

  const getCoordinatesForLocation = (location: string) => {
    // Try exact match first
    if (CITY_COORDINATES[location]) {
      return CITY_COORDINATES[location];
    }

    // Try partial match
    const matchingCity = Object.keys(CITY_COORDINATES).find(city =>
      location.toLowerCase().includes(city.toLowerCase()) ||
      city.toLowerCase().includes(location.toLowerCase())
    );

    return matchingCity ? CITY_COORDINATES[matchingCity] : null;
  };

  const unmappedEmployees = employees.filter(emp =>
    emp.location && !mappedLocations.some(loc =>
      emp.location === loc ||
      emp.location!.toLowerCase().includes(loc.toLowerCase())
    )
  );

  return (
    <div>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--border-color)',
        marginBottom: '20px'
      }}>
        <svg
          width="100%"
          height="auto"
          viewBox={`0 0 ${width} ${height}`}
          style={{
            background: '#1a2332',
            borderRadius: '8px'
          }}
        >
          {/* World map outline (simplified) */}
          <rect width={width} height={height} fill="#0f1419" />

          {/* Grid lines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`vline-${i}`}
              x1={(i * width) / 12}
              y1={0}
              x2={(i * width) / 12}
              y2={height}
              stroke="#2a3441"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`hline-${i}`}
              x1={0}
              y1={(i * height) / 6}
              x2={width}
              y2={(i * height) / 6}
              stroke="#2a3441"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}

          {/* Plot employee locations */}
          {mappedLocations.map(location => {
            const coords = getCoordinatesForLocation(location);
            if (!coords) return null;

            const empsAtLocation = employeesByLocation[location];
            const { x, y } = latLngToSvg(coords.lat, coords.lng, width, height);
            const isSelected = selectedLocation === location;

            return (
              <g key={location}>
                {/* Pulse animation ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 30 : 20}
                  fill="var(--cf-orange)"
                  opacity="0.2"
                >
                  <animate
                    attributeName="r"
                    from={isSelected ? 30 : 20}
                    to={isSelected ? 40 : 30}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.4"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Location marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 12 : 8}
                  fill={isSelected ? "var(--cf-orange)" : "var(--cf-blue)"}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredEmployee(empsAtLocation[0])}
                  onMouseLeave={() => setHoveredEmployee(null)}
                  onClick={() => setSelectedLocation(isSelected ? null : location)}
                />

                {/* Employee count badge */}
                {empsAtLocation.length > 1 && (
                  <g>
                    <circle
                      cx={x + 10}
                      cy={y - 10}
                      r={8}
                      fill="var(--cf-orange)"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={x + 10}
                      y={y - 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {empsAtLocation.length}
                    </text>
                  </g>
                )}

                {/* Location label */}
                <text
                  x={x}
                  y={y + 25}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="500"
                  style={{ pointerEvents: 'none' }}
                >
                  {location}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredEmployee && (
          <div style={{
            position: 'absolute',
            background: 'var(--bg-primary)',
            border: '2px solid var(--cf-orange)',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '-80px',
            marginLeft: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 1000
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {hoveredEmployee.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {hoveredEmployee.title}
            </div>
            {hoveredEmployee.location && (
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                📍 {hoveredEmployee.location}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected location details */}
      {selectedLocation && employeesByLocation[selectedLocation] && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📍 {selectedLocation} ({employeesByLocation[selectedLocation].length} {employeesByLocation[selectedLocation].length === 1 ? 'person' : 'people'})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {employeesByLocation[selectedLocation].map(emp => (
              <div
                key={emp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: getPhotoUrl(emp) ? 'transparent' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'white',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}
                >
                  {getPhotoUrl(emp) ? (
                    <img
                      src={getPhotoUrl(emp)!}
                      alt={emp.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.title}
                  </div>
                  {emp.department && (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {emp.department}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--cf-blue)', border: '2px solid white' }} />
          <span>Location</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--cf-orange)', border: '2px solid white' }} />
          <span>Selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'var(--cf-orange)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}>
            #
          </div>
          <span>Multiple employees</span>
        </div>
      </div>

      {/* Unmapped locations warning */}
      {unmappedEmployees.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '20px'
        }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            ℹ️ Employees with unmapped locations ({unmappedEmployees.length}):
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
            {Array.from(new Set(unmappedEmployees.map(e => e.location))).map(loc => (
              <span
                key={loc}
                style={{
                  padding: '4px 8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '4px',
                  color: 'var(--text-tertiary)'
                }}
              >
                {loc} ({unmappedEmployees.filter(e => e.location === loc).length})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
