/* ============================================================
   time.js – ÍNDICE MED/VAL (VERSÃO FUNCIONAL E DEFINITIVA)
   ============================================================ */

console.log("🚀 time.js carregado - versão funcional");

// Aguarda o DOM e os dados principais estarem prontos
document.addEventListener('DOMContentLoaded', async () => {
    // Pequeno delay para garantir que dadosCartola foi carregado
    await new Promise(r => setTimeout(r, 500));
    
    // 1. Localiza ou cria o container
    let container = document.getElementById('time-ranking-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'time-ranking-container';
        container.className = 'mt-8';
        const main = document.getElementById('main-content');
        if (main) main.appendChild(container);
        else document.body.appendChild(container);
    }
    
    container.innerHTML = '<div class="text-center py-10"><div class="loader mx-auto"></div><p class="mt-2 text-slate-400">Carregando ranking...</p></div>';
    
    // 2. Carrega os dados (mercado + histórico)
    let atletas = [];
    try {
        if (!window.dadosCartola || !window.dadosCartola.times) throw new Error("Histórico não disponível");
        const res = await fetch('https://proxy-f5nr.onrender.com/mercado');
        if (!res.ok) throw new Error("Falha mercado");
        const mercado = await res.json();
        
        for (const a of mercado.atletas) {
            const mpv = parseFloat(a.minimo_para_valorizar);
            const preco = parseFloat(a.preco_num);
            if (mpv <= 0.2 || preco <= 0) continue;
            
            // Calcula médias a partir do histórico
            let somaGeral=0, jogosGeral=0, somaCasa=0, jogosCasa=0, somaFora=0, jogosFora=0;
            for (const sigla in window.dadosCartola.times) {
                const partidas = window.dadosCartola.times[sigla];
                if (!Array.isArray(partidas)) continue;
                for (const p of partidas) {
                    const at = p.atletas.find(at => String(at.id_atleta) === String(a.atleta_id));
                    if (!at) continue;
                    const jogou = (at.pontuacao !== 0 || at.G>0 || at.A>0 || at.DS>0 || at.DE>0 || at.FC>0 || at.FS>0 || at.CA>0 || at.CV>0 || at.GS>0);
                    if (!jogou) continue;
                    const pts = parseFloat(at.pontuacao) || 0;
                    somaGeral += pts; jogosGeral++;
                    if (p.mando === 'CASA') { somaCasa += pts; jogosCasa++; }
                    else if (p.mando === 'FORA') { somaFora += pts; jogosFora++; }
                }
            }
            if (jogosGeral === 0) continue;
            
            atletas.push({
                id: a.atleta_id,
                nome: a.apelido_abreviado || a.apelido || a.nome,
                pos: a.posicao_abreviacao || '???',
                clube_id: a.clube_id,
                clube: (window.CLUBES && window.CLUBES[a.clube_id]) || '???',
                statusId: String(a.status_id),
                mpv, preco,
                jogosGeral, somaGeral,
                jogosCasa, somaCasa,
                jogosFora, somaFora
            });
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="text-center py-10 text-red-500">Erro: ${err.message}</div>`;
        return;
    }
    
    if (atletas.length === 0) {
        container.innerHTML = '<div class="text-center py-10">Nenhum atleta encontrado</div>';
        return;
    }
    
    // Estado dos filtros (global)
    const state = {
        atletas: atletas,
        mando: 'GERAL',
        status: ['7','2'],
        posicoes: ['ATA'],
        clubesIds: [...new Set(atletas.map(a => a.clube_id))],
        busca: '',
        minJogos: 1,
        sortCol: 'irp',
        sortDir: 'desc'
    };
    
    // Funções auxiliares
    function getMedia(a, m) {
        if (m === 'CASA') return a.jogosCasa ? a.somaCasa / a.jogosCasa : 0;
        if (m === 'FORA') return a.jogosFora ? a.somaFora / a.jogosFora : 0;
        return a.jogosGeral ? a.somaGeral / a.jogosGeral : 0;
    }
    function getJogos(a, m) {
        if (m === 'CASA') return a.jogosCasa;
        if (m === 'FORA') return a.jogosFora;
        return a.jogosGeral;
    }
    function irp(a, m) {
        const media = getMedia(a, m);
        const jogos = getJogos(a, m);
        if (jogos === 0 || a.mpv === 0) return 0;
        return (media / a.mpv) * a.preco * (Math.min(jogos, 12) / 12);
    }
    
    // Filtra e ordena
    function getFiltrados() {
        let lista = state.atletas.filter(a => {
            if (!state.status.includes(a.statusId)) return false;
            if (!state.posicoes.includes(a.pos)) return false;
            if (state.clubesIds.length && !state.clubesIds.includes(a.clube_id)) return false;
            if (state.busca && !a.nome.toLowerCase().includes(state.busca.toLowerCase())) return false;
            return getJogos(a, state.mando) >= state.minJogos;
        }).map(a => ({
            ...a,
            media: getMedia(a, state.mando),
            jogosMando: getJogos(a, state.mando),
            irp: irp(a, state.mando),
            razao: getMedia(a, state.mando) / a.mpv
        })).filter(a => a.jogosMando > 0);
        
        const dir = state.sortDir === 'asc' ? 1 : -1;
        lista.sort((a,b) => {
            let va = a[state.sortCol], vb = b[state.sortCol];
            if (state.sortCol === 'statusId') { va = parseInt(va); vb = parseInt(vb); }
            if (typeof va === 'string') return dir * va.localeCompare(vb);
            return dir * (va - vb);
        });
        return lista;
    }
    
    // Renderiza tudo
    function renderizar() {
        const lista = getFiltrados();
        if (!lista.length) {
            container.innerHTML = '<div class="text-center py-10">Nenhum atleta encontrado</div>';
            return;
        }
        
        const clubesList = [...new Map(state.atletas.map(a => [a.clube_id, a.clube])).entries()];
        const html = `
            <div class="mt-12 pt-6 border-t border-slate-200">
                <div class="text-center mb-6">
                    <h3 class="font-jogos text-3xl text-slate-800 uppercase italic">ÍNDICE <span class="text-orange-500">MED/VAL</span></h3>
                    <p class="text-[8px] text-slate-400 uppercase">POTENCIAL DE VALORIZAÇÃO</p>
                </div>
                <!-- Filtros -->
                <div class="bg-white rounded-2xl p-5 border mb-6">
                    <div class="flex flex-wrap gap-4 items-end">
                        <div><label class="text-[10px] uppercase">Mando</label><select id="time-mando" class="h-10 rounded-xl border px-3"><option value="GERAL">GERAL</option><option value="CASA">CASA</option><option value="FORA">FORA</option></select></div>
                        <div><label class="text-[10px] uppercase">Status</label><div class="flex gap-2">${['7','2','6','3','5'].map(v => `<label class="text-xs"><input type="checkbox" value="${v}" class="time-status" ${state.status.includes(v) ? 'checked' : ''}> ${v==='7'?'PROVÁVEL':v==='2'?'DÚVIDA':v==='6'?'NULO':v==='3'?'SUSPENSO':'CONTUNDIDO'}</label>`).join('')}</div></div>
                        <div><label class="text-[10px] uppercase">Posição</label><div class="flex gap-1">${['GOL','LAT','ZAG','MEI','ATA','TEC'].map(p => `<button data-pos="${p}" class="time-pos px-3 py-1 rounded-full text-xs ${state.posicoes.includes(p) ? 'bg-orange-500 text-white' : 'bg-slate-100'}">${p}</button>`).join('')}</div></div>
                        <div class="flex-1"><label class="text-[10px] uppercase">Clubes</label><div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl">${clubesList.map(([id, sig]) => `<button data-clube="${id}" class="time-clube w-12 h-12 p-1 rounded-xl ${state.clubesIds.includes(id) ? 'ring-2 ring-orange-500' : 'opacity-60'}"><img src="./images/escudos_brasileirao/${id}.png" class="w-full h-full object-contain" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\"text-xs\\">${sig}</span>'"></button>`).join('')}</div></div>
                        <div><label class="text-[10px] uppercase">Buscar</label><input type="text" id="time-busca" value="${state.busca.replace(/"/g, '&quot;')}" class="h-10 rounded-xl border px-3 w-32"></div>
                        <div><label class="text-[10px] uppercase">Min.Jogos</label><input type="number" id="time-min-jogos" value="${state.minJogos}" class="h-10 rounded-xl border px-3 w-20"></div>
                    </div>
                </div>
                <!-- Tabela -->
                <div class="bg-white rounded-2xl border overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead><tr class="bg-slate-50 border-b">${['nome','statusId','pos','clube','jogosMando','media','mpv','razao','preco','irp'].map(c => `<th class="px-4 py-3 text-left text-[10px] text-slate-400 uppercase cursor-pointer" onclick="window.timeSort('${c}')">${c} ${state.sortCol===c?(state.sortDir==='asc'?'▲':'▼'):'↕'}</th>`).join('')}</td></thead>
                        <tbody>${lista.map(a => {
                            const statusText = a.statusId==='7'?'PROVÁVEL':a.statusId==='2'?'DÚVIDA':a.statusId==='6'?'NULO':a.statusId==='3'?'SUSPENSO':'CONTUNDIDO';
                            return `<tr class="border-b hover:bg-orange-50/40 cursor-pointer" onclick="alert('${a.nome.replace(/'/g, "\\'")} – detalhes em breve')">
                                <td class="px-4 py-3 font-bold">${a.nome}</td>
                                <td class="px-4 py-3">${statusText}</td>
                                <td class="px-4 py-3"><span class="bg-slate-100 px-2 py-0.5 rounded-full">${a.pos}</span></td>
                                <td class="px-4 py-3">${a.clube}</td>
                                <td class="px-4 py-3 text-right">${a.jogosMando}</td>
                                <td class="px-4 py-3 text-right text-emerald-600 font-bold">${a.media.toFixed(2)}</td>
                                <td class="px-4 py-3 text-right">${a.mpv.toFixed(2)}</td>
                                <td class="px-4 py-3 text-right ${a.razao>=1?'text-emerald-600':'text-amber-600'}">${a.razao.toFixed(2)}x</td>
                                <td class="px-4 py-3 text-right">R$ ${a.preco.toFixed(2)}</td>
                                <td class="px-4 py-3 text-right font-black text-orange-600">${a.irp.toFixed(3)}</td>
                            </tr>`;
                        }).join('')}</tbody>
                    </table>
                </div>
                <div class="text-center mt-6 text-slate-300 text-xs">Fórmula: (Média / MPV) × Preço × Confiança</div>
            </div>
        `;
        container.innerHTML = html;
        
        // Anexar eventos após renderizar
        document.getElementById('time-mando')?.addEventListener('change', e => { state.mando = e.target.value; renderizar(); });
        document.querySelectorAll('.time-status').forEach(cb => cb.addEventListener('change', () => { state.status = Array.from(document.querySelectorAll('.time-status:checked')).map(c => c.value); renderizar(); }));
        document.querySelectorAll('.time-pos').forEach(btn => btn.addEventListener('click', () => { const p = btn.dataset.pos; if (state.posicoes.includes(p)) state.posicoes = state.posicoes.filter(x => x!==p); else state.posicoes.push(p); renderizar(); }));
        document.querySelectorAll('.time-clube').forEach(btn => btn.addEventListener('click', () => { const id = parseInt(btn.dataset.clube); if (state.clubesIds.includes(id)) state.clubesIds = state.clubesIds.filter(x => x!==id); else state.clubesIds.push(id); renderizar(); }));
        document.getElementById('time-busca')?.addEventListener('input', e => { state.busca = e.target.value; renderizar(); });
        document.getElementById('time-min-jogos')?.addEventListener('input', e => { state.minJogos = parseInt(e.target.value) || 0; renderizar(); });
    }
    
    window.timeSort = function(col) {
        if (state.sortCol === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortCol = col; state.sortDir = 'desc'; }
        renderizar();
    };
    
    // Renderiza
    renderizar();
});
