import { useState, useEffect, useRef } from "react";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Comprehensive list of cities with full location strings
const LOCATION_OPTIONS = [
  // North America - USA (Major Cities by State)
  // California
  "Los Angeles, CA, USA",
  "San Francisco, CA, USA",
  "San Diego, CA, USA",
  "San Jose, CA, USA",
  "Sacramento, CA, USA",
  "Oakland, CA, USA",
  "Fresno, CA, USA",
  "Irvine, CA, USA",
  "Santa Clara, CA, USA",
  "Palo Alto, CA, USA",

  // Texas
  "Houston, TX, USA",
  "Dallas, TX, USA",
  "Austin, TX, USA",
  "San Antonio, TX, USA",
  "Fort Worth, TX, USA",
  "El Paso, TX, USA",
  "Arlington, TX, USA",
  "Plano, TX, USA",

  // New York
  "New York, NY, USA",
  "Buffalo, NY, USA",
  "Rochester, NY, USA",
  "Albany, NY, USA",

  // Florida
  "Miami, FL, USA",
  "Tampa, FL, USA",
  "Orlando, FL, USA",
  "Jacksonville, FL, USA",
  "Fort Lauderdale, FL, USA",
  "St. Petersburg, FL, USA",
  "Tallahassee, FL, USA",

  // Illinois
  "Chicago, IL, USA",
  "Aurora, IL, USA",
  "Naperville, IL, USA",

  // Pennsylvania
  "Philadelphia, PA, USA",
  "Pittsburgh, PA, USA",

  // Ohio
  "Columbus, OH, USA",
  "Cleveland, OH, USA",
  "Cincinnati, OH, USA",

  // Georgia
  "Atlanta, GA, USA",
  "Savannah, GA, USA",

  // North Carolina
  "Charlotte, NC, USA",
  "Raleigh, NC, USA",
  "Durham, NC, USA",

  // Michigan
  "Detroit, MI, USA",
  "Grand Rapids, MI, USA",
  "Ann Arbor, MI, USA",

  // Washington
  "Seattle, WA, USA",
  "Spokane, WA, USA",
  "Tacoma, WA, USA",
  "Bellevue, WA, USA",

  // Massachusetts
  "Boston, MA, USA",
  "Cambridge, MA, USA",
  "Worcester, MA, USA",

  // Arizona
  "Phoenix, AZ, USA",
  "Tucson, AZ, USA",
  "Scottsdale, AZ, USA",
  "Mesa, AZ, USA",

  // Tennessee
  "Nashville, TN, USA",
  "Memphis, TN, USA",
  "Knoxville, TN, USA",

  // Missouri
  "Kansas City, MO, USA",
  "St. Louis, MO, USA",

  // Wisconsin
  "Milwaukee, WI, USA",
  "Madison, WI, USA",

  // Colorado
  "Denver, CO, USA",
  "Colorado Springs, CO, USA",
  "Boulder, CO, USA",

  // Minnesota
  "Minneapolis, MN, USA",
  "St. Paul, MN, USA",

  // Indiana
  "Indianapolis, IN, USA",

  // Oregon
  "Portland, OR, USA",
  "Eugene, OR, USA",

  // Nevada
  "Las Vegas, NV, USA",
  "Reno, NV, USA",

  // Maryland
  "Baltimore, MD, USA",

  // Virginia
  "Virginia Beach, VA, USA",
  "Richmond, VA, USA",
  "Arlington, VA, USA",

  // Louisiana
  "New Orleans, LA, USA",
  "Baton Rouge, LA, USA",

  // Kentucky
  "Louisville, KY, USA",

  // Oklahoma
  "Oklahoma City, OK, USA",
  "Tulsa, OK, USA",

  // New Jersey
  "Newark, NJ, USA",
  "Jersey City, NJ, USA",

  // New Mexico
  "Albuquerque, NM, USA",

  // Utah
  "Salt Lake City, UT, USA",

  // Connecticut
  "Hartford, CT, USA",

  // Rhode Island
  "Providence, RI, USA",

  // Alabama
  "Birmingham, AL, USA",

  // South Carolina
  "Charleston, SC, USA",
  "Columbia, SC, USA",

  // Nebraska
  "Omaha, NE, USA",

  // Kansas
  "Wichita, KS, USA",

  // Iowa
  "Des Moines, IA, USA",

  // Hawaii
  "Honolulu, HI, USA",

  // Alaska
  "Anchorage, AK, USA",

  // Washington DC
  "Washington, DC, USA",

  // North America - Canada
  "Toronto, ON, Canada",
  "Vancouver, BC, Canada",
  "Montreal, QC, Canada",
  "Calgary, AB, Canada",
  "Ottawa, ON, Canada",

  // North America - Mexico
  "Mexico City, Mexico",
  "Guadalajara, Mexico",
  "Monterrey, Mexico",

  // Europe - UK
  "London, UK",
  "Manchester, UK",
  "Edinburgh, UK",
  "Dublin, Ireland",

  // Europe - Western
  "Paris, France",
  "Berlin, Germany",
  "Amsterdam, Netherlands",
  "Madrid, Spain",
  "Barcelona, Spain",
  "Rome, Italy",
  "Milan, Italy",
  "Munich, Germany",
  "Frankfurt, Germany",
  "Lisbon, Portugal",
  "Brussels, Belgium",
  "Zurich, Switzerland",
  "Geneva, Switzerland",
  "Vienna, Austria",
  "Copenhagen, Denmark",

  // Europe - Northern
  "Stockholm, Sweden",
  "Oslo, Norway",
  "Helsinki, Finland",

  // Europe - Eastern
  "Warsaw, Poland",
  "Prague, Czech Republic",
  "Budapest, Hungary",
  "Bucharest, Romania",

  // Asia Pacific - East Asia
  "Tokyo, Japan",
  "Osaka, Japan",
  "Seoul, South Korea",
  "Shanghai, China",
  "Beijing, China",
  "Shenzhen, China",
  "Hong Kong",
  "Taipei, Taiwan",

  // Asia Pacific - Southeast Asia
  "Singapore",
  "Bangkok, Thailand",
  "Jakarta, Indonesia",
  "Manila, Philippines",
  "Kuala Lumpur, Malaysia",
  "Ho Chi Minh City, Vietnam",
  "Hanoi, Vietnam",

  // Asia Pacific - South Asia
  "Mumbai, India",
  "Bangalore, India",
  "Delhi, India",
  "Hyderabad, India",
  "Chennai, India",
  "Pune, India",
  "Kolkata, India",

  // Asia Pacific - Oceania
  "Sydney, Australia",
  "Melbourne, Australia",
  "Brisbane, Australia",
  "Perth, Australia",
  "Auckland, New Zealand",
  "Wellington, New Zealand",

  // Middle East
  "Dubai, UAE",
  "Abu Dhabi, UAE",
  "Tel Aviv, Israel",
  "Riyadh, Saudi Arabia",
  "Doha, Qatar",
  "Beirut, Lebanon",
  "Istanbul, Turkey",

  // Africa
  "Johannesburg, South Africa",
  "Cape Town, South Africa",
  "Cairo, Egypt",
  "Lagos, Nigeria",
  "Nairobi, Kenya",
  "Casablanca, Morocco",

  // South America
  "São Paulo, Brazil",
  "Rio de Janeiro, Brazil",
  "Buenos Aires, Argentina",
  "Santiago, Chile",
  "Bogotá, Colombia",
  "Lima, Peru",
].sort();

export function LocationAutocomplete({ value, onChange, placeholder = "Start typing a location..." }: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const searchTerm = value.toLowerCase();
      const filtered = LOCATION_OPTIONS.filter(option =>
        option.toLowerCase().includes(searchTerm)
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(LOCATION_OPTIONS.slice(0, 10)); // Show first 10 when empty
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option: string) => {
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="form-input"
        autoComplete="off"
        style={{ width: '100%' }}
      />

      {isOpen && filteredOptions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '240px',
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}
        >
          {filteredOptions.map((option, index) => (
            <div
              key={option}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                background: highlightedIndex === index ? 'var(--cf-blue)' : 'transparent',
                color: highlightedIndex === index ? 'white' : 'var(--text-primary)',
                borderBottom: index < filteredOptions.length - 1 ? '1px solid var(--border-color)' : 'none',
                fontSize: '14px',
                transition: 'all 0.15s ease'
              }}
            >
              📍 {option}
            </div>
          ))}

          {value && !filteredOptions.some(opt => opt.toLowerCase() === value.toLowerCase()) && (
            <div
              style={{
                padding: '10px 12px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                borderTop: filteredOptions.length > 0 ? '1px solid var(--border-color)' : 'none',
                fontStyle: 'italic'
              }}
            >
              Press Enter to use custom location: "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
