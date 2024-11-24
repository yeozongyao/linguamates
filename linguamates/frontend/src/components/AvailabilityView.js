import React from 'react';
import { Clock } from 'lucide-react';

const AvailabilityView = ({ slots }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {slots.map((slot, index) => (
        <div 
          key={index}
          className={`p-4 rounded-lg ${
            slot.status === 'booked' 
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-[#fff5d6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#8B4513]" />
              <span className="text-[#8B4513] font-medium">
                {slot.start} - {slot.end}
              </span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              slot.status === 'booked'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {slot.status === 'booked' ? 'Booked' : 'Available'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

export default AvailabilityView;