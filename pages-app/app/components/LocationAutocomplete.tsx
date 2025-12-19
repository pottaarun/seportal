import { useState, useEffect, useRef } from "react";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Comprehensive list of cities with full location strings
const LOCATION_OPTIONS = [
  // North America - USA
  "San Francisco, CA, USA",
  "Austin, TX, USA",
  "New York, NY, USA",
  "Seattle, WA, USA",
  "Chicago, IL, USA",
  "Los Angeles, CA, USA",
  "Boston, MA, USA",
  "Denver, CO, USA",
  "Portland, OR, USA",
  "Miami, FL, USA",
  "Atlanta, GA, USA",
  "Dallas, TX, USA",
  "Houston, TX, USA",
  "Phoenix, AZ, USA",
  "San Diego, CA, USA",
  "Las Vegas, NV, USA",
  "Philadelphia, PA, USA",
  "Washington, DC, USA",
  "Nashville, TN, USA",
  "Minneapolis, MN, USA",

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
