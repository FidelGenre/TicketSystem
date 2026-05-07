import { useState, useEffect } from 'react';
import { useLang } from '@/context/LanguageContext';
import api from '@/lib/api';
import { HiOutlineCreditCard, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_account';
  last4: string;
  brand: string;
  isDefault: boolean;
}

export default function PaymentMethods() {
  const { t, lang } = useLang();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: 'credit_card', last4: '', brand: '' });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const res = await api.get('/payments/methods');
      setMethods(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments/methods', {
        ...newMethod,
        providerId: 'mock_' + Date.now(),
      });
      setAdding(false);
      setNewMethod({ type: 'credit_card', last4: '', brand: '' });
      loadMethods();
    } catch (err) {
      alert('Error adding payment method');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar método de pago?')) return;
    try {
      await api.delete(`/payments/methods/${id}`);
      loadMethods();
    } catch (err) {
      alert('Error deleting payment method');
    }
  };

  if (loading) return <div className="text-center py-8">Cargando...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-gray-900">Métodos de Pago</h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
            <HiOutlinePlus className="w-4 h-4" /> Agregar
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Tipo</label>
              <select value={newMethod.type} onChange={e => setNewMethod({...newMethod, type: e.target.value})} className="input">
                <option value="credit_card">Tarjeta de Crédito</option>
                <option value="bank_account">Cuenta Bancaria</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">{newMethod.type === 'credit_card' ? 'Marca (Ej. Visa)' : 'Banco'}</label>
              <input required type="text" value={newMethod.brand} onChange={e => setNewMethod({...newMethod, brand: e.target.value})} className="input" placeholder={newMethod.type === 'credit_card' ? 'Visa, Mastercard...' : 'Banesco, Mercantil...'} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Últimos 4 dígitos / Final de cuenta</label>
            <input required type="text" maxLength={4} minLength={4} value={newMethod.last4} onChange={e => setNewMethod({...newMethod, last4: e.target.value.replace(/\D/g, '')})} className="input" placeholder="1234" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm flex-1">Guardar</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-secondary text-sm flex-1">Cancelar</button>
          </div>
        </form>
      )}

      {methods.length > 0 ? (
        <div className="space-y-3">
          {methods.map(method => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${method.type === 'credit_card' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                  <HiOutlineCreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{method.brand}</div>
                  <div className="text-sm text-gray-500">**** **** **** {method.last4}</div>
                </div>
                {method.isDefault && <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Principal</span>}
              </div>
              <button onClick={() => handleDelete(method.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <HiOutlineTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !adding && (
          <div className="text-center py-8 text-gray-500">
            No tienes métodos de pago registrados.
          </div>
        )
      )}
    </div>
  );
}
