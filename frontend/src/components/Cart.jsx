import { styles } from '../styles';

function Cart({ cart, setCart, cartTotal, submitOrder, isOrderingOpen, orderMessage, isSubmittingOrder }) {
  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' };

  return (
    <div className="section-kosar">
      <h2 style={styles.textMain}>🛒 Kosár tartalma</h2>
      <div style={styles.card}>
        {cart.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>A kosarad még üres. Válassz a kínálatból!</p>
        ) : (
          <div>
            {cart.map(item => (
              <div key={item.sandwichId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{item.quantity}x {item.name}</div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.price * item.quantity} Ft</span>
                </div>
                <button 
                  onClick={() => setCart(cart.filter(i => i.sandwichId !== item.sandwichId))} 
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '18px', cursor: 'pointer' }}
                >
                  ❌
                </button>
              </div>
            ))}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', fontWeight: 'bold', fontSize: '18px', color: 'var(--text-main)' }}>
              <span>Fizetendő:</span>
              <span style={{ color: '#27ae60' }}>{cartTotal} Ft</span>
            </div>
            
            <button 
                onClick={submitOrder} 
                disabled={!isOrderingOpen || isSubmittingOrder}
                style={{ 
                    ...styles.btnSuccess, width: '100%', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', 
                    ...(!isOrderingOpen || isSubmittingOrder ? disabledStyle : {}) 
                }}
                >
                {isSubmittingOrder ? <span className="spinner"></span> : 'Rendelés véglegesítése'}
            </button>
          </div>
        )}
        
        {orderMessage && (
          <div style={{ marginTop: '15px', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', background: orderMessage.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: orderMessage.startsWith('✅') ? '#10b981' : '#ef4444' }}>
            {orderMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;