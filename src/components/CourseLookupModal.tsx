import React, { useState, useEffect } from 'react';
import { GolfCourse, CourseTeeBox } from '../types';
import {
  searchGolfCourses,
  getStoredApiKey,
  saveStoredApiKey,
  generateSmartCourse,
} from '../utils/courseApi';
import {
  Search,
  X,
  MapPin,
  Check,
  Key,
  Plus,
  Compass,
  Loader2,
} from 'lucide-react';

interface CourseLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCourse: (course: GolfCourse, selectedTee: CourseTeeBox) => void;
  currentCourseName?: string;
}

export const CourseLookupModal: React.FC<CourseLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectCourse,
  currentCourseName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourse | null>(null);
  const [selectedTeeIndex, setSelectedTeeIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // API Key management
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  // Custom course quick create
  const [customName, setCustomName] = useState('');

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadCourses(searchQuery);
    }
  }, [isOpen]);

  const loadCourses = async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchGolfCourses(query, apiKey);
      setCourses(results);
      if (results.length > 0 && !selectedCourse) {
        // Try to match current course name if any
        const match = currentCourseName
          ? results.find((c) => c.name.toLowerCase().includes(currentCourseName.toLowerCase()))
          : null;
        const initial = match || results[0];
        setSelectedCourse(initial);
        setSelectedTeeIndex(0);
      }
    } catch (err) {
      console.error('Failed to search courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadCourses(val);
  };

  const handleSelectCourseItem = (course: GolfCourse) => {
    setSelectedCourse(course);
    setSelectedTeeIndex(0);
  };

  const handleSaveApiKey = () => {
    saveStoredApiKey(apiKey);
    setSavedKeySuccess(true);
    setTimeout(() => setSavedKeySuccess(false), 2000);
    loadCourses(searchQuery);
  };

  const handleCreateCustomCourse = () => {
    if (!customName.trim()) return;
    const newCourse = generateSmartCourse(customName);
    onSelectCourse(newCourse, newCourse.tees[0]);
    onClose();
  };

  const handleConfirmSelection = () => {
    if (!selectedCourse) return;
    const tee = selectedCourse.tees[selectedTeeIndex] || selectedCourse.tees[0];
    onSelectCourse(selectedCourse, tee);
    onClose();
  };

  if (!isOpen) return null;

  const currentTee = selectedCourse?.tees[selectedTeeIndex] || selectedCourse?.tees[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ⛳️
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Golf Course API & Scorecards</h2>
              <p className="text-xs text-slate-400">
                Auto-upload official pars & hole handicap stroke ranks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & API Toolbar */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 space-y-2">
          <div className="relative">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-emerald-400 absolute left-3 top-3 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search course name or city (e.g. Pebble Beach, Torrey Pines...)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-400">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              {courses.length} courses available
            </span>

            <button
              type="button"
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Key className="w-3 h-3" />
              {apiKey ? 'API Connected' : 'Add Live API Key'}
            </button>
          </div>

          {/* Collapsible API Key settings */}
          {showApiConfig && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2 animate-in fade-in">
              <div className="text-[10px] text-slate-300">
                Optional: Enter a <strong>RapidAPI / Golf Course API</strong> key for live search across 30,000+ global courses.
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste RapidAPI / Golf Course API Key"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  {savedKeySuccess ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-3 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Split layout: Course List & Selected Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left: Course List */}
            <div className="space-y-1.5 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block px-1">
                Select Course
              </span>

              {/* Quick Auto-Create option if searching */}
              {searchQuery.trim().length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const generated = generateSmartCourse(searchQuery);
                    setSelectedCourse(generated);
                    setSelectedTeeIndex(0);
                  }}
                  className="w-full text-left p-2 rounded-xl bg-emerald-950/40 border border-dashed border-emerald-600/70 text-emerald-300 hover:bg-emerald-950/70 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-[11px] truncate">
                    <span className="font-bold">Auto-Create Scorecard:</span>{' '}
                    <span className="text-white font-medium">"{searchQuery}"</span>
                  </div>
                </button>
              )}

              {courses.map((course) => {
                const isSelected = selectedCourse?.id === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleSelectCourseItem(course)}
                    className={`w-full text-left p-2.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs text-white leading-tight">{course.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{course.location}</span>
                      <span>• {course.tees.length} Tees</span>
                    </div>
                  </button>
                );
              })}

              {/* Not Found / Custom Course Creator */}
              <div className="p-2.5 bg-slate-950/60 border border-dashed border-slate-700 rounded-xl space-y-2 mt-2">
                <span className="text-[10px] text-slate-400 block">
                  Don't see your local course? Add any course name:
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Oakmont West or Local Muni"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCourse}
                    disabled={!customName.trim()}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-400 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Load
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Selected Course Scorecard Preview */}
            {selectedCourse && currentTee ? (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                    Selected Course
                  </span>
                  <h3 className="text-sm font-black text-white mt-1 leading-tight">
                    {selectedCourse.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-400" /> {selectedCourse.location}
                  </p>
                </div>

                {/* Tee Box Selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Select Tee Box:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCourse.tees.map((tee, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTeeIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          selectedTeeIndex === idx
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {tee.name}
                        {tee.yardage && <span className="text-[9px] opacity-75 ml-1">({tee.yardage}y)</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scorecard Quick Preview Grid */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                    <span>18-Hole Par & Handicap Allocation</span>
                    <span className="text-emerald-400">
                      Total Par: {currentTee.pars.reduce((a, b) => a + b, 0)}
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-[10px] text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-slate-400 font-bold border-b border-slate-700">
                          <th className="p-1">Hole</th>
                          {Array.from({ length: 9 }).map((_, i) => (
                            <th key={i} className="p-1">
                              {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-800">
                          <td className="p-1 font-bold bg-slate-900 text-slate-400">Par</td>
                          {currentTee.pars.slice(0, 9).map((p, i) => (
                            <td key={i} className="p-1 text-slate-200 font-semibold">
                              {p}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-800 bg-slate-900/40">
                          <td className="p-1 font-bold bg-slate-900 text-amber-400">SI</td>
                          {currentTee.handicapRanks.slice(0, 9).map((r, i) => (
                            <td key={i} className="p-1 text-amber-300 font-bold">
                              {r}
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-slate-800 text-slate-400 font-bold border-b border-slate-700">
                          <th className="p-1">Hole</th>
                          {Array.from({ length: 9 }).map((_, i) => (
                            <th key={i} className="p-1">
                              {i + 10}
                            </th>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-800">
                          <td className="p-1 font-bold bg-slate-900 text-slate-400">Par</td>
                          {currentTee.pars.slice(9, 18).map((p, i) => (
                            <td key={i} className="p-1 text-slate-200 font-semibold">
                              {p}
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-slate-900/40">
                          <td className="p-1 font-bold bg-slate-900 text-amber-400">SI</td>
                          {currentTee.handicapRanks.slice(9, 18).map((r, i) => (
                            <td key={i} className="p-1 text-amber-300 font-bold">
                              {r}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedCourse}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            <Check className="w-4 h-4" /> Upload Course & Hole Handicaps
          </button>
        </div>
      </div>
    </div>
  );
};
