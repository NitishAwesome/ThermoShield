import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * CitizenLayout
 * Scaffolds the clean, focused citizen experience.
 * Centers on personal heat safety, real-time risk, daily advisories, and outdoor planning.
 */
export const CitizenLayout: React.FC = () => {
  return (
    <div className="citizen-portal-viewport w-full animate-fadeIn">
      <Outlet />
    </div>
  );
};

export default CitizenLayout;
