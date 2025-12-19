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
  // North America - USA
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "San Francisco, CA, USA": { lat: 37.7749, lng: -122.4194 },
  "Austin": { lat: 30.2672, lng: -97.7431 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Austin, TX, USA": { lat: 30.2672, lng: -97.7431 },
  "New York": { lat: 40.7128, lng: -74.0060 },
  "New York, NY": { lat: 40.7128, lng: -74.0060 },
  "New York, NY, USA": { lat: 40.7128, lng: -74.0060 },
  "Seattle": { lat: 47.6062, lng: -122.3321 },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Seattle, WA, USA": { lat: 47.6062, lng: -122.3321 },
  "Chicago": { lat: 41.8781, lng: -87.6298 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Chicago, IL, USA": { lat: 41.8781, lng: -87.6298 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
  "Los Angeles, CA, USA": { lat: 34.0522, lng: -118.2437 },
  "Boston": { lat: 42.3601, lng: -71.0589 },
  "Boston, MA": { lat: 42.3601, lng: -71.0589 },
  "Boston, MA, USA": { lat: 42.3601, lng: -71.0589 },
  "Denver, CO, USA": { lat: 39.7392, lng: -104.9903 },
  "Portland, OR, USA": { lat: 45.5152, lng: -122.6784 },
  "Miami, FL, USA": { lat: 25.7617, lng: -80.1918 },
  "Atlanta, GA, USA": { lat: 33.7490, lng: -84.3880 },
  "Dallas, TX, USA": { lat: 32.7767, lng: -96.7970 },
  "Houston, TX, USA": { lat: 29.7604, lng: -95.3698 },
  "Phoenix, AZ, USA": { lat: 33.4484, lng: -112.0740 },
  "San Diego, CA, USA": { lat: 32.7157, lng: -117.1611 },
  "Las Vegas, NV, USA": { lat: 36.1699, lng: -115.1398 },
  "Philadelphia, PA, USA": { lat: 39.9526, lng: -75.1652 },
  "Washington, DC, USA": { lat: 38.9072, lng: -77.0369 },
  "Nashville, TN, USA": { lat: 36.1627, lng: -86.7816 },
  "Minneapolis, MN, USA": { lat: 44.9778, lng: -93.2650 },

  // North America - Canada
  "Toronto": { lat: 43.6532, lng: -79.3832 },
  "Toronto, ON, Canada": { lat: 43.6532, lng: -79.3832 },
  "Vancouver": { lat: 49.2827, lng: -123.1207 },
  "Vancouver, BC, Canada": { lat: 49.2827, lng: -123.1207 },
  "Montreal, QC, Canada": { lat: 45.5017, lng: -73.5673 },
  "Calgary, AB, Canada": { lat: 51.0447, lng: -114.0719 },
  "Ottawa, ON, Canada": { lat: 45.4215, lng: -75.6972 },

  // North America - Mexico
  "Mexico City": { lat: 19.4326, lng: -99.1332 },
  "Mexico City, Mexico": { lat: 19.4326, lng: -99.1332 },
  "Guadalajara, Mexico": { lat: 20.6597, lng: -103.3496 },
  "Monterrey, Mexico": { lat: 25.6866, lng: -100.3161 },

  // Europe - UK & Ireland
  "London": { lat: 51.5074, lng: -0.1278 },
  "London, UK": { lat: 51.5074, lng: -0.1278 },
  "Manchester, UK": { lat: 53.4808, lng: -2.2426 },
  "Edinburgh, UK": { lat: 55.9533, lng: -3.1883 },
  "Dublin": { lat: 53.3498, lng: -6.2603 },
  "Dublin, Ireland": { lat: 53.3498, lng: -6.2603 },

  // Europe - Western
  "Paris": { lat: 48.8566, lng: 2.3522 },
  "Paris, France": { lat: 48.8566, lng: 2.3522 },
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Berlin, Germany": { lat: 52.5200, lng: 13.4050 },
  "Amsterdam": { lat: 52.3676, lng: 4.9041 },
  "Amsterdam, Netherlands": { lat: 52.3676, lng: 4.9041 },
  "Madrid": { lat: 40.4168, lng: -3.7038 },
  "Madrid, Spain": { lat: 40.4168, lng: -3.7038 },
  "Barcelona, Spain": { lat: 41.3851, lng: 2.1734 },
  "Rome": { lat: 41.9028, lng: 12.4964 },
  "Rome, Italy": { lat: 41.9028, lng: 12.4964 },
  "Milan, Italy": { lat: 45.4642, lng: 9.1900 },
  "Munich": { lat: 48.1351, lng: 11.5820 },
  "Munich, Germany": { lat: 48.1351, lng: 11.5820 },
  "Frankfurt, Germany": { lat: 50.1109, lng: 8.6821 },
  "Lisbon": { lat: 38.7223, lng: -9.1393 },
  "Lisbon, Portugal": { lat: 38.7223, lng: -9.1393 },
  "Brussels, Belgium": { lat: 50.8503, lng: 4.3517 },
  "Zurich, Switzerland": { lat: 47.3769, lng: 8.5417 },
  "Geneva, Switzerland": { lat: 46.2044, lng: 6.1432 },
  "Vienna, Austria": { lat: 48.2082, lng: 16.3738 },
  "Copenhagen, Denmark": { lat: 55.6761, lng: 12.5683 },

  // Europe - Northern
  "Stockholm": { lat: 59.3293, lng: 18.0686 },
  "Stockholm, Sweden": { lat: 59.3293, lng: 18.0686 },
  "Oslo, Norway": { lat: 59.9139, lng: 10.7522 },
  "Helsinki, Finland": { lat: 60.1699, lng: 24.9384 },

  // Europe - Eastern
  "Warsaw": { lat: 52.2297, lng: 21.0122 },
  "Warsaw, Poland": { lat: 52.2297, lng: 21.0122 },
  "Prague, Czech Republic": { lat: 50.0755, lng: 14.4378 },
  "Budapest, Hungary": { lat: 47.4979, lng: 19.0402 },
  "Bucharest, Romania": { lat: 44.4268, lng: 26.1025 },

  // Asia Pacific - East Asia
  "Tokyo": { lat: 35.6762, lng: 139.6503 },
  "Tokyo, Japan": { lat: 35.6762, lng: 139.6503 },
  "Osaka, Japan": { lat: 34.6937, lng: 135.5023 },
  "Seoul": { lat: 37.5665, lng: 126.9780 },
  "Seoul, South Korea": { lat: 37.5665, lng: 126.9780 },
  "Shanghai": { lat: 31.2304, lng: 121.4737 },
  "Shanghai, China": { lat: 31.2304, lng: 121.4737 },
  "Beijing": { lat: 39.9042, lng: 116.4074 },
  "Beijing, China": { lat: 39.9042, lng: 116.4074 },
  "Shenzhen, China": { lat: 22.5431, lng: 114.0579 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694 },
  "Taipei, Taiwan": { lat: 25.0330, lng: 121.5654 },

  // Asia Pacific - Southeast Asia
  "Singapore": { lat: 1.3521, lng: 103.8198 },
  "Bangkok": { lat: 13.7563, lng: 100.5018 },
  "Bangkok, Thailand": { lat: 13.7563, lng: 100.5018 },
  "Jakarta, Indonesia": { lat: -6.2088, lng: 106.8456 },
  "Manila, Philippines": { lat: 14.5995, lng: 120.9842 },
  "Kuala Lumpur, Malaysia": { lat: 3.1390, lng: 101.6869 },
  "Ho Chi Minh City, Vietnam": { lat: 10.8231, lng: 106.6297 },
  "Hanoi, Vietnam": { lat: 21.0285, lng: 105.8542 },

  // Asia Pacific - South Asia
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Mumbai, India": { lat: 19.0760, lng: 72.8777 },
  "Bangalore": { lat: 12.9716, lng: 77.5946 },
  "Bangalore, India": { lat: 12.9716, lng: 77.5946 },
  "Delhi, India": { lat: 28.7041, lng: 77.1025 },
  "Hyderabad, India": { lat: 17.3850, lng: 78.4867 },
  "Chennai, India": { lat: 13.0827, lng: 80.2707 },
  "Pune, India": { lat: 18.5204, lng: 73.8567 },
  "Kolkata, India": { lat: 22.5726, lng: 88.3639 },

  // Asia Pacific - Oceania
  "Sydney": { lat: -33.8688, lng: 151.2093 },
  "Sydney, Australia": { lat: -33.8688, lng: 151.2093 },
  "Melbourne": { lat: -37.8136, lng: 144.9631 },
  "Melbourne, Australia": { lat: -37.8136, lng: 144.9631 },
  "Brisbane, Australia": { lat: -27.4698, lng: 153.0251 },
  "Perth, Australia": { lat: -31.9505, lng: 115.8605 },
  "Auckland, New Zealand": { lat: -36.8485, lng: 174.7633 },
  "Wellington, New Zealand": { lat: -41.2865, lng: 174.7762 },

  // Middle East
  "Dubai": { lat: 25.2048, lng: 55.2708 },
  "Dubai, UAE": { lat: 25.2048, lng: 55.2708 },
  "Abu Dhabi, UAE": { lat: 24.4539, lng: 54.3773 },
  "Tel Aviv": { lat: 32.0853, lng: 34.7818 },
  "Tel Aviv, Israel": { lat: 32.0853, lng: 34.7818 },
  "Riyadh, Saudi Arabia": { lat: 24.7136, lng: 46.6753 },
  "Doha, Qatar": { lat: 25.2854, lng: 51.5310 },
  "Beirut, Lebanon": { lat: 33.8886, lng: 35.4955 },
  "Istanbul, Turkey": { lat: 41.0082, lng: 28.9784 },

  // Africa
  "Johannesburg": { lat: -26.2041, lng: 28.0473 },
  "Johannesburg, South Africa": { lat: -26.2041, lng: 28.0473 },
  "Cape Town, South Africa": { lat: -33.9249, lng: 18.4241 },
  "Cairo": { lat: 30.0444, lng: 31.2357 },
  "Cairo, Egypt": { lat: 30.0444, lng: 31.2357 },
  "Lagos, Nigeria": { lat: 6.5244, lng: 3.3792 },
  "Nairobi, Kenya": { lat: -1.2921, lng: 36.8219 },
  "Casablanca, Morocco": { lat: 33.5731, lng: -7.5898 },

  // South America
  "São Paulo": { lat: -23.5505, lng: -46.6333 },
  "São Paulo, Brazil": { lat: -23.5505, lng: -46.6333 },
  "Rio de Janeiro, Brazil": { lat: -22.9068, lng: -43.1729 },
  "Buenos Aires": { lat: -34.6037, lng: -58.3816 },
  "Buenos Aires, Argentina": { lat: -34.6037, lng: -58.3816 },
  "Santiago": { lat: -33.4489, lng: -70.6693 },
  "Santiago, Chile": { lat: -33.4489, lng: -70.6693 },
  "Bogotá, Colombia": { lat: 4.7110, lng: -74.0721 },
  "Lima, Peru": { lat: -12.0464, lng: -77.0428 },
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
            background: 'linear-gradient(180deg, #0a1628 0%, #1a2842 100%)',
            borderRadius: '8px'
          }}
        >
          {/* Ocean background */}
          <rect width={width} height={height} fill="url(#oceanGradient)" />

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0d1b2a" />
              <stop offset="100%" stopColor="#1b3a4b" />
            </linearGradient>
            <linearGradient id="landGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2d3e50" />
              <stop offset="100%" stopColor="#1e2d3d" />
            </linearGradient>
          </defs>

          {/* Simplified world map continents */}
          {/* North America */}
          <path
            d="M 150 100 L 180 80 L 220 85 L 260 95 L 290 110 L 310 140 L 320 180 L 310 220 L 280 250 L 250 270 L 220 275 L 190 260 L 170 240 L 160 210 L 155 180 L 150 150 Z"
            fill="url(#landGradient)"
            stroke="#4a5f7f"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* South America */}
          <path
            d="M 280 310 L 300 290 L 315 295 L 325 315 L 330 340 L 335 370 L 330 400 L 320 420 L 305 435 L 290 440 L 280 435 L 275 415 L 270 390 L 270 360 L 275 330 Z"
            fill="url(#landGradient)"
            stroke="#4a5f7f"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Europe */}
          <path
            d="M 550 120 L 580 110 L 610 115 L 630 125 L 640 140 L 635 160 L 620 175 L 600 180 L 580 178 L 565 170 L 555 155 L 550 135 Z"
            fill="url(#landGradient)"
            stroke="#4a5f7f"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Africa */}
          <path
            d="M 580 200 L 600 195 L 620 200 L 640 215 L 655 240 L 665 270 L 670 305 L 665 340 L 650 370 L 630 390 L 605 400 L 585 395 L 570 380 L 560 355 L 555 320 L 555 285 L 560 250 L 570 220 Z"
            fill="url(#landGradient)"
            stroke="#4a5f7f"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Asia */}
          <path
            d="M 650 80 L 700 75 L 750 80 L 800 90 L 850 105 L 900 125 L 930 150 L 950 180 L 955 210 L 950 240 L 930 265 L 900 280 L 860 285 L 820 280 L 780 270 L 750 255 L 720 235 L 700 210 L 685 180 L 675 150 L 670 120 L 665 95 Z"
            fill="url(#landGradient)"
            stroke="#4a5f7f"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Australia */}
          <path
            d="M 950 380 L 980 375 L 1010 380 L 1035 395 L 1045 415 L 1040 435 L 1020 450 L 990 455 L 965 450 L 945 435 L 940 410 L 945 390 Z"
            fill="url(#landGradient)"
            stroke="#4a5f7f"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Grid lines for coordinates */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`vline-${i}`}
              x1={(i * width) / 12}
              y1={0}
              x2={(i * width) / 12}
              y2={height}
              stroke="#2d4a5c"
              strokeWidth="0.5"
              opacity="0.2"
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`hline-${i}`}
              x1={0}
              y1={(i * height) / 6}
              x2={width}
              y2={(i * height) / 6}
              stroke="#2d4a5c"
              strokeWidth="0.5"
              opacity="0.2"
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
