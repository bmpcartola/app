/* ============================================================
   JOGOS.JS — Script para a nova página de Jogos
   ============================================================ */

window.renderJogos = async function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="max-w-7xl mx-auto pb-48 pt-2 px-4 md:px-8 space-y-8 animate-in fade-in duration-1000">
            <div class="text-center space-y-1 mb-6">
                <h2 class="font-jogos text-4xl md:text-6xl text-slate-900 leading-none tracking-tighter uppercase italic">PRÓXIMOS <span class="text-orange-500">JOGOS</span></h2>
                <p class="text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase">CALENDÁRIO E RESULTADOS</p>
            </div>
            
            <div class="bg-white rounded-[40px] border border-slate-100 p-12 text-center shadow-sm">
                <div class="flex flex-col items-center gap-6">
                    <div class="p-6 bg-orange-50 rounded-full">
                         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500"><circle cx="12" cy="12" r="10"/><path d="m11 12 2-3 2 1"/><path d="m11 12-2-3-2 1"/><path d="m11 12 1 3h3v-2l-2-1Z"/><path d="m11 12-1 3H7v-2l2-1Z"/><path d="M12 2v3"/><path d="m19 6-2 2"/><path d="m22 12-3 1"/><path d="m19 18-2-2"/><path d="M12 22v-3"/><path d="m5 18 2-2"/><path d="M2 12l3 1"/><path d="m5 6 2 2"/></svg>
                    </div>
                    <div class="space-y-2">
                        <h3 class="text-2xl font-bold text-slate-800">EM DESENVOLVIMENTO</h3>
                        <p class="text-slate-500 font-mono text-sm">O script jogos.js está sendo implementado para trazer as melhores estatísticas dos confrontos.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (typeof lucide !== "undefined") lucide.createIcons();
};

console.log("✅ jogos.js carregado");
