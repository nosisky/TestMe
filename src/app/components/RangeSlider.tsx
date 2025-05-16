'use client';

import React, { useEffect, useState } from 'react';
import RangeSliderLib from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import './RangeSlider.css';

interface RangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number | [number, number];
  defaultValue?: number | [number, number];
  disabled?: boolean;
  className?: string;
  onChange?: (value: number | [number, number]) => void;
  onChangeComplete?: (value: number | [number, number]) => void;
  showLabels?: boolean;
  labelFormatter?: (value: number) => string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  disabled = false,
  className = '',
  onChange,
  onChangeComplete,
  showLabels = false,
  labelFormatter = (val) => val.toString(),
}) => {
  // Determine if this is a single or range slider
  const isSingleSlider = !Array.isArray(value) && !Array.isArray(defaultValue);
  
  // Convert single value to range format for the component
  const getInitialValue = () => {
    if (value !== undefined) {
      return isSingleSlider ? [min, value as number] : value as [number, number];
    }
    if (defaultValue !== undefined) {
      return isSingleSlider ? [min, defaultValue as number] : defaultValue as [number, number];
    }
    return isSingleSlider ? [min, min] : [min, max];
  };

  const [currentValue, setCurrentValue] = useState<[number, number]>(getInitialValue() as [number, number]);

  useEffect(() => {
    if (value !== undefined) {
      const newValue: [number, number] = isSingleSlider 
        ? [min, value as number] 
        : value as [number, number];
      setCurrentValue(newValue);
    }
  }, [value, min, isSingleSlider]);

  const handleChange = (newValue: [number, number]) => {
    setCurrentValue(newValue);
    
    if (onChange) {
      if (isSingleSlider) {
        onChange(newValue[1]);
      } else {
        onChange(newValue);
      }
    }
  };

  const handleFinalChange = () => {
    if (onChangeComplete) {
      if (isSingleSlider) {
        onChangeComplete(currentValue[1]);
      } else {
        onChangeComplete(currentValue);
      }
    }
  };

  return (
    <div className={`custom-range-slider-container ${className}`}>
      {showLabels && (
        <div className="range-slider-labels">
          <span className="min-label">{labelFormatter(min)}</span>
          <span className="max-label">{labelFormatter(max)}</span>
        </div>
      )}
      
      <RangeSliderLib
        id="range-slider"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onInput={handleChange}
        onThumbDragEnd={handleFinalChange}
        disabled={disabled}
        className={`custom-range-slider ${isSingleSlider ? 'single-slider' : ''}`}
      />
      
      {showLabels && isSingleSlider && (
        <div className="current-value-label">
          {labelFormatter(currentValue[1])}
        </div>
      )}
      
      {showLabels && !isSingleSlider && (
        <div className="range-values-labels">
          <span className="range-start-label">{labelFormatter(currentValue[0])}</span>
          <span className="range-end-label">{labelFormatter(currentValue[1])}</span>
        </div>
      )}
    </div>
  );
};

export default RangeSlider; 