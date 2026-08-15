import React, { useState } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  QrCode, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Download,
  Building2,
  Gift,
  Ticket,
  PackageCheck
} from 'lucide-react';
import { MOCK_ESCROW_TRANSACTIONS } from '../../data/mockData';
import { EscrowTransaction, UserRole } from '../../types';
import confetti from 'canvas-confetti';

interface RecompensasViewProps {
  currentUserRole: UserRole;
}

export const RecompensasView: React.FC<RecompensasViewProps> = ({ currentUserRole }) => {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>(MOCK_ESCROW_TRANSACTIONS);
  const [activeGateway, setActiveGateway] = useState<'STRIPE' | 'BINANCE_PAY'>('STRIPE');
  const [selectedReceipt, setSelectedReceipt] = useState<EscrowTransaction | null>(null);
  const [amountInput, setAmountInput] = useState('5,000');
  const [payerName, setPayerName] = useState('Team Luminex Vault');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successTx, setSuccessTx] = useState<EscrowTransaction | null>(null);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const generatedUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    setTimeout(() => {
      const newTx: EscrowTransaction = {
        id: `tx-${Date.now()}`,
        uuid: generatedUUID,
        tournamentId: 'tour-1',
        tournamentName: 'PRO LEAGUE SEASON 5',
        amountUSD: parseInt(amountInput.replace(/,/g, '')) || 5000,
        gateway: activeGateway,
        status: 'LOCKED',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        payer: payerName,
        recipientTeam: 'Pendiente de Finalista',
        txHash: activeGateway === 'BINANCE_PAY' 
          ? `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`
          : `pi_${Date.now()}_secret`
      };

      setTransactions([newTx, ...transactions]);
      setSuccessTx(newTx);
      setIsProcessing(false);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 800);
  };

  const handleReleaseEscrow = (txId: string) => {
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Organizador') {
      alert('Solo los Administradores u Organizadores pueden liberar fondos de custodia.');
      return;
    }

    setTransactions(transactions.map(t => {
      if (t.id === txId) {
        return { ...t, status: 'RELEASED', recipientTeam: 'LUMINEX ESPORTS (Ganador)' };
      }
      return t;
    }));

    alert('Los fondos se entregaron correctamente al equipo ganador.');
  };

  return (
    <div id="recompensas-escrow-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase tracking-tight italic flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#ff2e83]" />
            Premios y pagos
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-tech">
            Bolsas de premios en custodia garantizada, pagos con Stripe y Binance Pay (USDT) con recibos criptográficos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono-code bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Fondos protegidos
          </span>
        </div>
      </div>

      {/* 2-COLUMN: PAYMENT GATEWAY SIMULATOR & ESCROW LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: PAYMENT / DEPOSIT GATEWAY SIMULATOR */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-6 shadow-2xl">
          <div>
            <span className="text-[10px] font-mono-code uppercase font-bold text-[#ff2e83]">
              Nueva aportación
            </span>
            <h2 className="font-display font-black text-2xl text-white mt-1">
              Agregar fondos al premio
            </h2>
            <p className="text-xs text-slate-400">
              Elige un método y registra la aportación para el torneo.
            </p>
          </div>

          {/* Gateway Switcher Tabs */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-[#141724] border border-[#1e2230]">
            <button
              type="button"
              onClick={() => setActiveGateway('STRIPE')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeGateway === 'STRIPE'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>STRIPE (TARJETA)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGateway('BINANCE_PAY')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeGateway === 'BINANCE_PAY'
                  ? 'bg-[#F0B90B] text-black shadow-lg shadow-[#F0B90B]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>BINANCE PAY (CRYPTO)</span>
            </button>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div>
              <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                Monto de la aportación (USD)
              </label>
              <div className="relative mt-1">
                <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-mono-code font-bold focus:border-[#ff2e83] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                Nombre del Patrocinador / Entidad
              </label>
              <input
                type="text"
                required
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1"
              />
            </div>

            {activeGateway === 'STRIPE' ? (
              <div className="space-y-3 p-4 rounded-2xl bg-[#141724] border border-[#232738]">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono-code">Stripe Simulated Elements</span>
                  <span className="text-emerald-400 font-bold">256-bit SSL</span>
                </div>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-[#0c0d14] border border-[#1e2230] rounded-xl px-4 py-2 text-xs font-mono-code text-slate-300"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    defaultValue="12/28"
                    className="w-full bg-[#0c0d14] border border-[#1e2230] rounded-xl px-4 py-2 text-xs font-mono-code text-slate-300"
                  />
                  <input
                    type="text"
                    defaultValue="CVC 889"
                    className="w-full bg-[#0c0d14] border border-[#1e2230] rounded-xl px-4 py-2 text-xs font-mono-code text-slate-300"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#141724] border border-[#F0B90B]/30 flex items-center gap-4">
                <div className="w-20 h-20 bg-white p-1.5 rounded-xl shrink-0 flex items-center justify-center">
                  {/* Mock QR Code */}
                  <div className="w-full h-full bg-[#0a0b0e] rounded p-1 flex items-center justify-center text-center">
                    <QrCode className="w-12 h-12 text-[#F0B90B]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Escanea con Binance App</div>
                  <p className="text-[11px] text-slate-400">
                    Acepta USDT, BTC, ETH, BUSD en red BEP-20 con confirmación instantánea.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isProcessing ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>Confirmar aportación</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Success Banner */}
          {successTx && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Aportación registrada
                </span>
                <button
                  onClick={() => setSelectedReceipt(successTx)}
                  className="text-xs text-white underline hover:text-emerald-300 font-mono-code"
                >
                  Ver Recibo UUID
                </button>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400">
                UUID: {successTx.uuid}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: ESCROW LEDGER & TRANSACTIONS TABLE */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
              <div>
                <h2 className="font-display font-black text-2xl text-white">
                  Movimientos del premio
                </h2>
                <p className="text-xs text-slate-400">
                  Fondos retenidos y regla de distribución automática
                </p>
              </div>
              <span className="text-xs font-mono-code text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
                {transactions.length} Transacciones
              </span>
            </div>

            {/* Transactions List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl bg-[#141724] border border-[#1e2230] hover:border-slate-600 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                          tx.gateway === 'STRIPE' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {tx.gateway}
                        </span>
                        <span className="font-bold text-white text-xs">{tx.tournamentName}</span>
                      </div>
                      <div className="text-[10px] font-mono-code text-slate-500 mt-1">
                        Payer: {tx.payer} • {tx.date}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono-code font-bold text-sm text-emerald-400">
                        ${tx.amountUSD.toLocaleString()} USD
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                        tx.status === 'LOCKED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {tx.status === 'LOCKED' ? '🔒 BLOQUEADO' : '✓ LIBERADO'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1e2230] flex items-center justify-between text-xs">
                    <button
                      onClick={() => setSelectedReceipt(tx)}
                      className="text-[11px] text-[#ff2e83] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Descargar Recibo / Cupón
                    </button>

                    {tx.status === 'LOCKED' && (
                      <button
                        onClick={() => handleReleaseEscrow(tx.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-mono-code text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Liberar al Ganador
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1e2230] text-[11px] font-mono-code text-slate-500 flex items-center justify-between">
            <span>Regla de Payout: 1er 60% • 2do 25% • 3er 15%</span>
            <span className="text-emerald-400">Ledger Verificado</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-[#10121a] border border-[#1e2230] rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between"><div><h2 className="font-display font-black text-xl text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-[#ff2e83]" /> Patrocinadores</h2><p className="text-xs text-slate-400 mt-1">Entidades disponibles para financiar bolsas y recompensas.</p></div><button className="px-3 py-2 rounded-xl bg-[#ff2e83] text-white text-xs font-bold">＋ AGREGAR</button></div>
          {[['HyperX LATAM', 'contacto@hyperx.test', 'ACTIVO'], ['Arena Sports MX', 'alianzas@arena.test', 'ACTIVO'], ['GamePass Partners', 'rewards@gamepass.test', 'INACTIVO']].map(([name, email, status]) => <div key={name} className="flex items-center justify-between p-3 rounded-2xl bg-[#151824] border border-[#24293b]"><div><div className="font-bold text-sm text-white">{name}</div><div className="text-[11px] text-slate-500">{email}</div></div><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${status === 'ACTIVO' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>{status}</span></div>)}
        </section>

        <section className="bg-[#10121a] border border-[#1e2230] rounded-3xl p-6 space-y-5">
          <div><h2 className="font-display font-black text-xl text-white flex items-center gap-2"><Gift className="w-5 h-5 text-[#ff2e83]" /> Premios y cupones</h2><p className="text-xs text-slate-400 mt-1">Inventario demostrativo para premios físicos y digitales.</p></div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[{ icon: PackageCheck, label: 'Jersey oficial', type: 'FÍSICO', stock: 3 }, { icon: Ticket, label: 'Código de juego', type: 'DIGITAL', stock: 12 }, { icon: CreditCard, label: 'Gift card $500', type: 'CUPÓN', stock: 8 }].map(({ icon: Icon, label, type, stock }) => <div key={label} className="p-4 rounded-2xl bg-[#151824] border border-[#24293b]"><Icon className="w-5 h-5 text-[#ff2e83]" /><div className="font-bold text-sm text-white mt-3">{label}</div><div className="text-[10px] text-slate-500 mt-1">{type}</div><div className="text-xs text-emerald-400 mt-3">{stock} disponibles</div></div>)}
          </div>
        </section>
      </div>

      {/* RECEIPT / COUPON MODAL */}
      {selectedReceipt && (
        <div 
          id="modal-receipt-view"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#12141f] border border-[#282e44] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
              <h3 className="font-display font-black text-2xl text-white">
                Comprobante de aportación
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white font-mono-code text-lg"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Canvas */}
            <div className="p-6 rounded-2xl bg-[#0a0b0e] border border-[#232738] space-y-4 font-mono-code text-xs">
              <div className="text-center pb-3 border-b border-dashed border-[#232738]">
                <div className="font-display font-black text-lg text-white">TOURNAMENTX</div>
                <div className="text-[10px] text-slate-500">Comprobante de Custodia Digital</div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">UUID DE TRANSACCIÓN:</span>
                  <span className="text-[#ff2e83] font-bold text-[9px]">{selectedReceipt.uuid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TORNEO:</span>
                  <span className="text-white font-bold">{selectedReceipt.tournamentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MONTO:</span>
                  <span className="text-emerald-400 font-bold text-sm">${selectedReceipt.amountUSD.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PASARELA:</span>
                  <span className="text-white font-bold">{selectedReceipt.gateway}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ESTADO:</span>
                  <span className="text-amber-400 font-bold">{selectedReceipt.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FECHA:</span>
                  <span className="text-slate-300">{selectedReceipt.date}</span>
                </div>
              </div>

              {/* Barcode Mock */}
              <div className="pt-4 border-t border-dashed border-[#232738] text-center space-y-1">
                <div className="h-10 bg-gradient-to-r from-transparent via-slate-700 to-transparent flex items-center justify-center tracking-widest text-[9px] text-slate-400">
                  ||| | |||| || ||| ||||| ||| | ||
                </div>
                <span className="text-[9px] text-slate-500">VALIDACIÓN HASH SHA-256</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  alert('Comprobante guardado en portapapeles y listo para imprimir.');
                  setSelectedReceipt(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir / Descargar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
