import React from 'react';

const SandwichSkeleton = () => {
  return (
    <>
      <style>
        {`
          @keyframes pulseSkeleton {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
          .skeleton-animate {
            animation: pulseSkeleton 1.5s ease-in-out infinite;
          }
        `}
      </style>

      <div className="skeleton-animate" style={{ 
        background: 'white', 
        borderRadius: '16px', 
        padding: '20px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
        border: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        minHeight: '160px' 
      }}>
        <div style={{ background: '#cbd5e1', height: '24px', width: '70%', margin: '0 auto', borderRadius: '8px' }}></div>
        <div style={{ background: '#e2e8f0', height: '18px', width: '40%', margin: '0 auto', borderRadius: '8px' }}></div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <div style={{ background: '#e2e8f0', height: '40px', width: '60px', borderRadius: '8px' }}></div>
          <div style={{ background: '#cbd5e1', height: '40px', flex: 1, borderRadius: '20px' }}></div>
        </div>
      </div>
    </>
  );
};

export default SandwichSkeleton;