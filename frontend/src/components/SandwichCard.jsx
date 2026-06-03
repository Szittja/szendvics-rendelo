import { styles } from '../styles';

function SandwichCard({ sw, quantities, setQuantities, isOrderingOpen, addToCart }) {
  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' };

  return (
    <div style={{ ...styles.card, margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
      
      {/* Szendvics neve és ára */}
      <div>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{sw.name}</h3>
        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px' }}>{sw.price} Ft</span>
      </div>
      
      {/* Beviteli mező és Kosárba gomb */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px', justifyContent: 'center', alignItems: 'center' }}>
        <input 
          type="number" 
          min="1" 
          disabled={!isOrderingOpen} 
          value={quantities[sw.id] === 0 || quantities[sw.id] === '' ? '' : (quantities[sw.id] || 1)} 
          onChange={e => {
            const val = e.target.value;
            setQuantities(prev => ({
              ...prev,
              [sw.id]: val === '' ? '' : parseInt(val)
            }));
          }}
          onBlur={e => {
            const val = parseInt(e.target.value);
            if (!val || val < 1) {
              setQuantities(prev => ({
                ...prev,
                [sw.id]: 1
              }));
            }
          }}
          style={{ 
            width: '60px', height: '48px', padding: '0', textAlign: 'center', borderRadius: '12px', border: 'none', background: '#f1f5f9', fontWeight: '900', fontSize: '18px', color: '#1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)', boxSizing: 'border-box', 
            ...(!isOrderingOpen ? { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' } : {}) 
          }} 
        />

        <button 
          onClick={() => addToCart({ ...sw, id: sw.id })} 
          disabled={!isOrderingOpen}
          style={{ 
            ...styles.btnPrimary, height: '48px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '0 24px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', 
            ...(!isOrderingOpen ? disabledStyle : {}) 
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          Kosárba
        </button>
      </div>

    </div>
  );
}

export default SandwichCard;