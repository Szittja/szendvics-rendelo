export const styles = {
  btnPrimary: { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' },
  btnSuccess: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' },
  btnDanger: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' },
  
  input: { padding: '14px 16px', borderRadius: '14px', border: '2px solid var(--border-color)', fontSize: '15px', width: '100%', boxSizing: 'border-box', background: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none' }, 
  textMain: { color: 'var(--text-main)', fontWeight: '800', letterSpacing: '-0.5px' },

  loginContainer: { 
    background: 'var(--bg-card)', padding: '50px 40px', borderRadius: '24px', 
    boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
    maxWidth: '450px', width: '90%', margin: '10vh auto', 
    display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box'
  },
  loginHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '15px' },

  pageContainer: { maxWidth: '1200px', margin: '0 auto', padding: '15px', boxSizing: 'border-box', width: '100%' },
  headerWrap: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' },
  gridContainer: { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start', width: '100%' },
  gridColumnMain: { flex: '1 1 65%', minWidth: '300px', width: '100%', boxSizing: 'border-box' },
  gridColumnSide: { flex: '1 1 30%', minWidth: '300px', width: '100%', boxSizing: 'border-box' },
  
  card: { 
    background: 'var(--bg-card)', padding: '25px', borderRadius: '24px', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: '20px', 
    border: '1px solid var(--border-color)', boxSizing: 'border-box', width: '100%'
  }
};