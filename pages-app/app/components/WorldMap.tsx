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
  // California
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
  "Los Angeles, CA, USA": { lat: 34.0522, lng: -118.2437 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "San Francisco, CA, USA": { lat: 37.7749, lng: -122.4194 },
  "San Diego, CA, USA": { lat: 32.7157, lng: -117.1611 },
  "San Jose, CA, USA": { lat: 37.3382, lng: -121.8863 },
  "Sacramento, CA, USA": { lat: 38.5816, lng: -121.4944 },
  "Oakland, CA, USA": { lat: 37.8044, lng: -122.2712 },
  "Fresno, CA, USA": { lat: 36.7378, lng: -119.7871 },
  "Irvine, CA, USA": { lat: 33.6846, lng: -117.8265 },
  "Santa Clara, CA, USA": { lat: 37.3541, lng: -121.9552 },
  "Palo Alto, CA, USA": { lat: 37.4419, lng: -122.1430 },

  // Texas
  "Houston": { lat: 29.7604, lng: -95.3698 },
  "Houston, TX, USA": { lat: 29.7604, lng: -95.3698 },
  "Dallas": { lat: 32.7767, lng: -96.7970 },
  "Dallas, TX, USA": { lat: 32.7767, lng: -96.7970 },
  "Austin": { lat: 30.2672, lng: -97.7431 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Austin, TX, USA": { lat: 30.2672, lng: -97.7431 },
  "San Antonio, TX, USA": { lat: 29.4241, lng: -98.4936 },
  "Fort Worth, TX, USA": { lat: 32.7555, lng: -97.3308 },
  "El Paso, TX, USA": { lat: 31.7619, lng: -106.4850 },
  "Arlington, TX, USA": { lat: 32.7357, lng: -97.1081 },
  "Plano, TX, USA": { lat: 33.0198, lng: -96.6989 },

  // New York
  "New York": { lat: 40.7128, lng: -74.0060 },
  "New York, NY": { lat: 40.7128, lng: -74.0060 },
  "New York, NY, USA": { lat: 40.7128, lng: -74.0060 },
  "Buffalo, NY, USA": { lat: 42.8864, lng: -78.8784 },
  "Rochester, NY, USA": { lat: 43.1566, lng: -77.6088 },
  "Albany, NY, USA": { lat: 42.6526, lng: -73.7562 },

  // Florida
  "Miami": { lat: 25.7617, lng: -80.1918 },
  "Miami, FL, USA": { lat: 25.7617, lng: -80.1918 },
  "Tampa, FL, USA": { lat: 27.9506, lng: -82.4572 },
  "Orlando, FL, USA": { lat: 28.5383, lng: -81.3792 },
  "Jacksonville, FL, USA": { lat: 30.3322, lng: -81.6557 },
  "Fort Lauderdale, FL, USA": { lat: 26.1224, lng: -80.1373 },
  "St. Petersburg, FL, USA": { lat: 27.7676, lng: -82.6403 },
  "Tallahassee, FL, USA": { lat: 30.4383, lng: -84.2807 },

  // Illinois
  "Chicago": { lat: 41.8781, lng: -87.6298 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Chicago, IL, USA": { lat: 41.8781, lng: -87.6298 },
  "Aurora, IL, USA": { lat: 41.7606, lng: -88.3201 },
  "Naperville, IL, USA": { lat: 41.7508, lng: -88.1535 },

  // Pennsylvania
  "Philadelphia": { lat: 39.9526, lng: -75.1652 },
  "Philadelphia, PA, USA": { lat: 39.9526, lng: -75.1652 },
  "Pittsburgh, PA, USA": { lat: 40.4406, lng: -79.9959 },

  // Ohio
  "Columbus, OH, USA": { lat: 39.9612, lng: -82.9988 },
  "Cleveland, OH, USA": { lat: 41.4993, lng: -81.6944 },
  "Cincinnati, OH, USA": { lat: 39.1031, lng: -84.5120 },

  // Georgia
  "Atlanta": { lat: 33.7490, lng: -84.3880 },
  "Atlanta, GA, USA": { lat: 33.7490, lng: -84.3880 },
  "Savannah, GA, USA": { lat: 32.0809, lng: -81.0912 },

  // North Carolina
  "Charlotte, NC, USA": { lat: 35.2271, lng: -80.8431 },
  "Raleigh, NC, USA": { lat: 35.7796, lng: -78.6382 },
  "Durham, NC, USA": { lat: 35.9940, lng: -78.8986 },

  // Michigan
  "Detroit, MI, USA": { lat: 42.3314, lng: -83.0458 },
  "Grand Rapids, MI, USA": { lat: 42.9634, lng: -85.6681 },
  "Ann Arbor, MI, USA": { lat: 42.2808, lng: -83.7430 },

  // Washington
  "Seattle": { lat: 47.6062, lng: -122.3321 },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Seattle, WA, USA": { lat: 47.6062, lng: -122.3321 },
  "Spokane, WA, USA": { lat: 47.6588, lng: -117.4260 },
  "Tacoma, WA, USA": { lat: 47.2529, lng: -122.4443 },
  "Bellevue, WA, USA": { lat: 47.6101, lng: -122.2015 },

  // Massachusetts
  "Boston": { lat: 42.3601, lng: -71.0589 },
  "Boston, MA": { lat: 42.3601, lng: -71.0589 },
  "Boston, MA, USA": { lat: 42.3601, lng: -71.0589 },
  "Cambridge, MA, USA": { lat: 42.3736, lng: -71.1097 },
  "Worcester, MA, USA": { lat: 42.2626, lng: -71.8023 },

  // Arizona
  "Phoenix": { lat: 33.4484, lng: -112.0740 },
  "Phoenix, AZ, USA": { lat: 33.4484, lng: -112.0740 },
  "Tucson, AZ, USA": { lat: 32.2226, lng: -110.9747 },
  "Scottsdale, AZ, USA": { lat: 33.4942, lng: -111.9261 },
  "Mesa, AZ, USA": { lat: 33.4152, lng: -111.8315 },

  // Tennessee
  "Nashville": { lat: 36.1627, lng: -86.7816 },
  "Nashville, TN, USA": { lat: 36.1627, lng: -86.7816 },
  "Memphis, TN, USA": { lat: 35.1495, lng: -90.0490 },
  "Knoxville, TN, USA": { lat: 35.9606, lng: -83.9207 },

  // Missouri
  "Kansas City, MO, USA": { lat: 39.0997, lng: -94.5786 },
  "St. Louis, MO, USA": { lat: 38.6270, lng: -90.1994 },

  // Wisconsin
  "Milwaukee, WI, USA": { lat: 43.0389, lng: -87.9065 },
  "Madison, WI, USA": { lat: 43.0731, lng: -89.4012 },

  // Colorado
  "Denver": { lat: 39.7392, lng: -104.9903 },
  "Denver, CO, USA": { lat: 39.7392, lng: -104.9903 },
  "Colorado Springs, CO, USA": { lat: 38.8339, lng: -104.8214 },
  "Boulder, CO, USA": { lat: 40.0150, lng: -105.2705 },

  // Minnesota
  "Minneapolis": { lat: 44.9778, lng: -93.2650 },
  "Minneapolis, MN, USA": { lat: 44.9778, lng: -93.2650 },
  "St. Paul, MN, USA": { lat: 44.9537, lng: -93.0900 },

  // Indiana
  "Indianapolis, IN, USA": { lat: 39.7684, lng: -86.1581 },

  // Oregon
  "Portland": { lat: 45.5152, lng: -122.6784 },
  "Portland, OR, USA": { lat: 45.5152, lng: -122.6784 },
  "Eugene, OR, USA": { lat: 44.0521, lng: -123.0868 },

  // Nevada
  "Las Vegas": { lat: 36.1699, lng: -115.1398 },
  "Las Vegas, NV, USA": { lat: 36.1699, lng: -115.1398 },
  "Reno, NV, USA": { lat: 39.5296, lng: -119.8138 },

  // Maryland
  "Baltimore, MD, USA": { lat: 39.2904, lng: -76.6122 },

  // Virginia
  "Virginia Beach, VA, USA": { lat: 36.8529, lng: -75.9780 },
  "Richmond, VA, USA": { lat: 37.5407, lng: -77.4360 },
  "Arlington, VA, USA": { lat: 38.8816, lng: -77.0910 },

  // Louisiana
  "New Orleans, LA, USA": { lat: 29.9511, lng: -90.0715 },
  "Baton Rouge, LA, USA": { lat: 30.4515, lng: -91.1871 },

  // Kentucky
  "Louisville, KY, USA": { lat: 38.2527, lng: -85.7585 },

  // Oklahoma
  "Oklahoma City, OK, USA": { lat: 35.4676, lng: -97.5164 },
  "Tulsa, OK, USA": { lat: 36.1540, lng: -95.9928 },

  // New Jersey
  "Newark, NJ, USA": { lat: 40.7357, lng: -74.1724 },
  "Jersey City, NJ, USA": { lat: 40.7178, lng: -74.0431 },

  // New Mexico
  "Albuquerque, NM, USA": { lat: 35.0844, lng: -106.6504 },

  // Utah
  "Salt Lake City, UT, USA": { lat: 40.7608, lng: -111.8910 },

  // Connecticut
  "Hartford, CT, USA": { lat: 41.7658, lng: -72.6734 },

  // Rhode Island
  "Providence, RI, USA": { lat: 41.8240, lng: -71.4128 },

  // Alabama
  "Birmingham, AL, USA": { lat: 33.5207, lng: -86.8025 },

  // South Carolina
  "Charleston, SC, USA": { lat: 32.7765, lng: -79.9311 },
  "Columbia, SC, USA": { lat: 34.0007, lng: -81.0348 },

  // Nebraska
  "Omaha, NE, USA": { lat: 41.2565, lng: -95.9345 },

  // Kansas
  "Wichita, KS, USA": { lat: 37.6872, lng: -97.3301 },

  // Iowa
  "Des Moines, IA, USA": { lat: 41.5868, lng: -93.6250 },

  // Hawaii
  "Honolulu, HI, USA": { lat: 21.3099, lng: -157.8581 },

  // Alaska
  "Anchorage, AK, USA": { lat: 61.2181, lng: -149.9003 },

  // Washington DC
  "Washington, DC": { lat: 38.9072, lng: -77.0369 },
  "Washington, DC, USA": { lat: 38.9072, lng: -77.0369 },

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
