import { useState } from "react";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";

type FilterType = 'all' | 'events' | 'places' | 'teams' | 'coaches' | 'players' | 'challenges';
type TimeFilter = 'all' | 'today' | 'week' | 'weekend';

interface MapFilterBarProps {
  filterType: FilterType;
  onFilterTypeChange: (type: FilterType) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (time: TimeFilter) => void;
  sportFilter: string;
  onSportFilterChange: (sport: string) => void;
  distanceFilter: string;
  onDistanceFilterChange: (distance: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  pinCount: number;
  onAdvancedFiltersToggle: () => void;
  showAdvanced: boolean;
}

const categoryPills: { value: FilterType; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '📍' },
  { value: 'places', label: 'Venues', emoji: '🏟️' },
  { value: 'events', label: 'Events', emoji: '📅' },
  { value: 'teams', label: 'Teams', emoji: '👥' },
  { value: 'coaches', label: 'Coaches', emoji: '🏅' },
  { value: 'players', label: 'Players', emoji: '🏃' },
  { value: 'challenges', label: 'Challenges', emoji: '🏆' },
];

const timePills: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'Anytime' },
  { value: 'today', label: 'Now' },
  { value: 'week', label: 'This Week' },
  { value: 'weekend', label: 'Weekend' },
];

const sports = [
  { value: 'all', label: 'All Sports', emoji: '🏆' },
  { value: 'boxing', label: 'Boxing', emoji: '🥊' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'soccer', label: 'Soccer', emoji: '⚽' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'swimming', label: 'Swimming', emoji: '🏊' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'cycling', label: 'Cycling', emoji: '🚴' },
  { value: 'mma', label: 'MMA', emoji: '🥋' },
  { value: 'baseball', label: 'Baseball', emoji: '⚾' },
  { value: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { value: 'football', label: 'Football', emoji: '🏈' },
  { value: 'hockey', label: 'Hockey', emoji: '🏒' },
  { value: 'golf', label: 'Golf', emoji: '⛳' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'crossfit', label: 'CrossFit', emoji: '🏋️' },
  { value: 'rugby', label: 'Rugby', emoji: '🏉' },
  { value: 'cricket', label: 'Cricket', emoji: '🏏' },
  { value: 'gaa', label: 'GAA', emoji: '🏐' },
  { value: 'hurling', label: 'Hurling', emoji: '🏑' },
];

const distances = [
  { value: 'all', label: 'Any Distance' },
  { value: '1', label: '1 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
];

export default function MapFilterBar({
  filterType,
  onFilterTypeChange,
  timeFilter,
  onTimeFilterChange,
  sportFilter,
  onSportFilterChange,
  distanceFilter,
  onDistanceFilterChange,
  searchQuery,
  onSearchChange,
  pinCount,
  onAdvancedFiltersToggle,
  showAdvanced,
}: MapFilterBarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showSports, setShowSports] = useState(false);

  const activeFilters = [
    filterType !== 'all' ? 1 : 0,
    timeFilter !== 'all' ? 1 : 0,
    sportFilter !== 'all' ? 1 : 0,
    distanceFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
      <div className="pointer-events-auto">
        {showSearch && (
          <div className="mx-3 mt-3 mb-2">
            <div className="map-search-bar">
              <Search size={16} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search map..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="map-search-input"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => onSearchChange('')} className="map-search-clear">
                  <X size={14} />
                </button>
              )}
              <button onClick={() => { setShowSearch(false); onSearchChange(''); }} className="map-search-clear">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="px-3 pt-3 space-y-2">
          <div className="flex items-center gap-2">
            {!showSearch && (
              <button
                onClick={() => setShowSearch(true)}
                className="map-filter-pill"
                style={{ padding: '8px 12px' }}
              >
                <Search size={15} />
              </button>
            )}

            <div className="map-filter-scroll">
              {categoryPills.map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => onFilterTypeChange(pill.value)}
                  className={`map-filter-pill ${filterType === pill.value ? 'active' : ''}`}
                >
                  <span className="text-sm">{pill.emoji}</span>
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onAdvancedFiltersToggle}
              className={`map-filter-pill ${activeFilters > 0 ? 'active' : ''}`}
              style={{ padding: '8px 12px', position: 'relative' }}
            >
              <SlidersHorizontal size={15} />
              {activeFilters > 0 && (
                <span className="map-filter-badge">{activeFilters}</span>
              )}
            </button>
          </div>

          <div className="map-filter-scroll">
            {timePills.map((pill) => (
              <button
                key={pill.value}
                onClick={() => onTimeFilterChange(pill.value)}
                className={`map-filter-pill small ${timeFilter === pill.value ? 'active' : ''}`}
              >
                {pill.label}
              </button>
            ))}

            <button
              onClick={() => setShowSports(!showSports)}
              className={`map-filter-pill small ${sportFilter !== 'all' ? 'active' : ''}`}
            >
              {sportFilter !== 'all'
                ? sports.find(s => s.value === sportFilter)?.emoji + ' ' + sports.find(s => s.value === sportFilter)?.label
                : 'All Sports'}
              <ChevronDown size={12} style={{ transform: showSports ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
        </div>

        {showSports && (
          <div className="mx-3 mt-2">
            <div className="map-sport-dropdown">
              {sports.map((sport) => (
                <button
                  key={sport.value}
                  onClick={() => { onSportFilterChange(sport.value); setShowSports(false); }}
                  className={`map-sport-option ${sportFilter === sport.value ? 'active' : ''}`}
                >
                  <span>{sport.emoji}</span>
                  <span>{sport.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showAdvanced && (
          <div className="mx-3 mt-2">
            <div className="map-advanced-sheet">
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Advanced Filters</span>
                <button onClick={onAdvancedFiltersToggle} className="map-search-clear">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="map-filter-label">Distance</label>
                  <div className="flex flex-wrap gap-1.5">
                    {distances.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => onDistanceFilterChange(d.value)}
                        className={`map-filter-pill small ${distanceFilter === d.value ? 'active' : ''}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  {pinCount} results
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
