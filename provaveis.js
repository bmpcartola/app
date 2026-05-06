/* ============================================================
   PROVÁVEIS ESCALAÇÕES — V.FINAL (COM GRÁFICO DE PONTUAÇÃO)
   ============================================================ */

const PROXY_URL_PROVAVEIS = 'https://proxy-f5nr.onrender.com';

let provavelState = {
    partidasData: null,
    lineupsData: null,
    mercadoData: null,
    loading: false,
    error: null
};

// Map of Cartola IDs to Proxy Slugs for Lineups
const SLUG_TO_ID_MAP = {
    corinthians_v2: 264, palmeiras_v2: 275, flamengo_v2: 262, vasco_v2: 267,
    'atletico-mg_v2': 282, cruzeiro_v2: 283, gremio_v2: 284, internacional_v2: 285,
    botafogo_v2: 263, fluminense_v2: 266, 'sao-paulo_v2': 276, santos_v2: 277,
    bragantino_v2: 280, 'athletico-pr_v2': 293, bahia_v2: 265, vitoria_v2: 287,
    mirassol_v2: 2305, chapecoense_v2: 315, coritiba_v2: 294, remo_v2: 364
};

async function fetchProvaveisData() {
    provavelState.loading = true;
    provavelState.error = null;
    
    try {
        // Fetch matches from Cartola API via Proxy to avoid CORS
        const partidasRes = await fetch(`${PROXY_URL_PROVAVEIS}/partidas`);
        if (!partidasRes.ok) throw new Error("Erro ao carregar partidas via proxy");
        provavelState.partidasData = await partidasRes.json();

        // Try to fetch Lineups and Mercado Images from Proxy
        try {
            const lineupsRes = await fetch(`${PROXY_URL_PROVAVEIS}/lineups`);
            if (lineupsRes.ok) provavelState.lineupsData = await lineupsRes.json();
            
            const mercadoRes = await fetch(`${PROXY_URL_PROVAVEIS}/mercado-images`);
            if (mercadoRes.ok) {
                const mercadoArray = await mercadoRes.json();
                provavelState.mercadoData = new Map();
                mercadoArray.forEach(item => provavelState.mercadoData.set(item.atleta_id, item));
            }
        } catch (e) {
            console.warn("⚠️ Proxy details failed, using basic match info.", e);
        }

    } catch (err) {
        console.error("❌ Erro em Prováveis:", err);
        provavelState.error = err.message;
    } finally {
        provavelState.loading = false;
    }
}

function getTeamShield(teamId) {
    // Shield path as requested: /images/escudos_brasileirao/{ID}.png
    return `images/escudos_brasileirao/${teamId}.png`;
}

function renderShieldsContainer() {
    if (!provavelState.partidasData || !provavelState.partidasData.partidas) return '';

    const matches = provavelState.partidasData.partidas;
    
    return `
        <div class="bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 p-8 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-1000">
            <p class="text-[10px] font-black font-jogos text-slate-400 tracking-[0.3em] mb-6 uppercase text-center">Partidas da Rodada</p>
            <div class="flex flex-wrap items-center justify-start gap-4 md:gap-6">
                ${matches.map((match, idx) => `
                    <div class="flex items-center gap-1 group">
                        <!-- Mandante -->
                        <button onclick="scrollToTeamField(${idx}, ${match.clube_casa_id})" class="w-10 h-10 md:w-12 md:h-12 p-1.5 bg-white rounded-xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm hover:scale-110 active:scale-95 group/btn">
                            <img src="${getTeamShield(match.clube_casa_id)}" 
                                 class="w-full h-full object-contain drop-shadow-sm"
                                 onerror="this.src='https://s.glbimg.com/es/sde/f/equipes/2018/03/12/identidade-visual-60x60.png'">
                        </button>
                        
                        <!-- Visitante -->
                        <button onclick="scrollToTeamField(${idx}, ${match.clube_visitante_id})" class="w-10 h-10 md:w-12 md:h-12 p-1.5 bg-white rounded-xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm hover:scale-110 active:scale-95 group/btn">
                            <img src="${getTeamShield(match.clube_visitante_id)}" 
                                 class="w-full h-full object-contain drop-shadow-sm"
                                 onerror="this.src='https://s.glbimg.com/es/sde/f/equipes/2018/03/12/identidade-visual-60x60.png'">
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderDots(results) {
    if (!results || !Array.isArray(results)) return '<div class="h-1.5 mb-1 text-transparent">.</div>';
    return `
        <div class="flex gap-0.5 justify-center mb-1">
            ${results.map(res => {
                let color = 'bg-slate-300'; 
                if (res === 'v') color = 'bg-emerald-500';
                if (res === 'd') color = 'bg-red-500';
                return `<div class="w-1.5 h-1.5 rounded-full ${color}"></div>`;
            }).join('')}
        </div>
    `;
}

function getNomeArquivo(id, playerInfo) {
    const nome = playerInfo?.apelido || playerInfo?.nome || '';
    if (nome) {
        return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    return '';
}

function renderFieldPlayers(lineup, teamId) {
    if (!lineup || !lineup.titulares) return '';
    
    return lineup.titulares
        .filter(p => p.slot !== 'TEC')
        .map(p => {
            const playerInfo = provavelState.mercadoData?.get(p.id);
            const nome = playerInfo?.apelido || playerInfo?.nome || '...';
            const nomeArquivo = getNomeArquivo(p.id, playerInfo);
            const fotoLocal = nomeArquivo ? `images/jogadores/${p.id}_${nomeArquivo}.webp` : null;
            const fotoProxy = playerInfo?.foto || '';
            const isDuvida = p.sit === 'duvida';
            
            // coordinates from JSON (0-100)
            const x = p.x; 
            const y = p.y;

            const onClickAttr = `onclick="event.stopPropagation(); window.abrirModalJogador(${p.id}, ${teamId})"`;

            return `
                <div class="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform" 
                     style="left: ${x}%; top: ${y}%; transform: translate(-50%, -50%); z-index: 10;"
                     ${onClickAttr}>
                    <div class="w-6 h-6 md:w-10 md:h-10 rounded-full bg-white/95 p-0.5 shadow-sm border ${isDuvida ? 'border-orange-500' : 'border-white'}">
                        <img src="${fotoLocal}" 
                             class="w-full h-full object-contain rounded-full" 
                             onerror="this.onerror=null; this.src='${fotoProxy || getTeamShield(teamId)}'">
                    </div>
                    <div class="mt-0.5 bg-black/60 backdrop-blur-[1px] px-1 rounded-[2px] max-w-[42px] md:max-w-[60px] truncate border border-white/10">
                        <p class="text-[4px] md:text-[6px] font-black text-white uppercase leading-none text-center truncate">${nome}</p>
                    </div>
                </div>
            `;
        }).join('');
}

function renderMiniField(matchIdx, teamId) {
    const slug = Object.keys(SLUG_TO_ID_MAP).find(key => SLUG_TO_ID_MAP[key] === teamId);
    const lineup = slug ? provavelState.lineupsData?.teams?.[slug] : null;
    
    const playersHtml = lineup ? renderFieldPlayers(lineup, teamId) : `
        <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-[8px] font-black font-jogos text-white/20 uppercase tracking-[0.2em] -rotate-12">Escalação em breve</span>
        </div>
    `;

    return `
        <div id="field-${matchIdx}-${teamId}" class="relative w-full aspect-[4/5] bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-2xl overflow-hidden shadow-inner border border-emerald-900/20 group/field">
            <!-- Field Lines -->
            <div class="absolute inset-4 border-2 border-white/10 pointer-events-none opacity-40"></div>
            <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 pointer-events-none"></div>
            <div class="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40"></div>
            
            <!-- Team Shield - More visible as requested -->
            <div class="absolute top-3 left-3 w-12 h-12 md:w-20 md:h-20 opacity-40 drop-shadow-2xl pointer-events-none">
                <img src="${getTeamShield(teamId)}" class="w-full h-full object-contain grayscale brightness-200">
            </div>

            <!-- Content Area (Players) -->
            ${playersHtml}
        </div>
    `;
}

function renderLineupCards() {
    if (!provavelState.partidasData || !provavelState.partidasData.partidas) return '';
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            ${provavelState.partidasData.partidas.map((match, idx) => {
                const clubeCasa = provavelState.partidasData.clubes[match.clube_casa_id];
                const clubeVisitante = provavelState.partidasData.clubes[match.clube_visitante_id];
                
                return `
                <div id="match-card-${idx}" class="bg-white rounded-[40px] border border-slate-100 p-2.5 md:p-4 shadow-sm group hover:shadow-xl transition-all duration-500 overflow-hidden relative">
                    <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div class="flex items-center justify-between mb-1.5 gap-1 text-center">
                        <div class="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                             <div class="flex items-center gap-0.5">
                                 <span class="font-jersey text-xl md:text-2xl text-slate-200 pointer-events-none mt-2">${match.clube_casa_posicao}<span class="text-[0.6em] ml-0.5">º</span></span>
                                 <div class="flex flex-col items-center">
                                     ${renderDots(match.aproveitamento_mandante)}
                                     <div class="w-11 h-11 md:w-16 md:h-16 bg-slate-50 p-1.5 md:p-2 rounded-xl border border-slate-100 group-hover:border-orange-100 transition-colors">
                                        <img src="${getTeamShield(match.clube_casa_id)}" class="w-full h-full object-contain drop-shadow-md">
                                     </div>
                                 </div>
                             </div>
                             <p class="font-jogos text-[7px] md:text-xs text-slate-800 uppercase leading-tight truncate w-full px-1">${clubeCasa?.nome || 'Casa'}</p>
                        </div>
                        
                        <div class="flex flex-col items-center">
                            <span class="text-slate-200 font-black font-jogos italic text-xs md:text-lg mt-3">VS</span>
                        </div>

                        <div class="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                             <div class="flex items-center gap-0.5 text-center">
                                 <div class="flex flex-col items-center">
                                     ${renderDots(match.aproveitamento_visitante)}
                                     <div class="w-11 h-11 md:w-16 md:h-16 bg-slate-50 p-1.5 md:p-2 rounded-xl border border-slate-100 group-hover:border-orange-100 transition-colors">
                                        <img src="${getTeamShield(match.clube_visitante_id)}" class="w-full h-full object-contain drop-shadow-md">
                                     </div>
                                 </div>
                                 <span class="font-jersey text-xl md:text-2xl text-slate-200 pointer-events-none mt-2">${match.clube_visitante_posicao}<span class="text-[0.6em] ml-0.5">º</span></span>
                             </div>
                             <p class="font-jogos text-[7px] md:text-xs text-slate-800 uppercase leading-tight truncate w-full px-1">${clubeVisitante?.nome || 'Fora'}</p>
                        </div>
                    </div>

                    <div class="space-y-1 mt-2">
                        <div class="px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-center group-hover:bg-white transition-colors mb-2">
                            <p class="text-[6px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">Local & Horário</p>
                            <p class="text-[8px] md:text-xs font-bold text-slate-700 leading-tight truncate">${match.local || 'Estádio a definir'}</p>
                            <div class="h-[1px] w-3 bg-slate-200 mx-auto my-0.5"></div>
                            <p class="text-[7px] md:text-[9px] font-mono font-bold text-orange-500 uppercase">${new Date(match.partida_data).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</p>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2">
                            ${renderMiniField(idx, match.clube_casa_id)}
                            ${renderMiniField(idx, match.clube_visitante_id)}
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

window.scrollToMatch = (index) => {
    const el = document.getElementById(`match-card-${index}`);
    if (el) {
        const offset = 120;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
};

window.scrollToTeamField = (matchIdx, teamId) => {
    const el = document.getElementById(`field-${matchIdx}-${teamId}`);
    if (el) {
        const offset = 150;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        // Visual feedback
        el.classList.add('ring-4', 'ring-orange-500', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-4', 'ring-orange-500', 'ring-offset-2'), 2000);
    }
};

window.renderProvaveis = async function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
            <div class="loader"></div>
            <div class="text-center">
                <p class="text-slate-400 font-jogos text-xs tracking-[0.4em] uppercase animate-pulse">Sincronizando Escalações</p>
                <p class="text-[10px] font-mono text-slate-300 mt-2 uppercase tracking-widest">Aguardando dados oficiais...</p>
            </div>
        </div>
    `;

    await fetchProvaveisData();

    if (provavelState.error) {
        main.innerHTML = `
            <div class="max-w-xl mx-auto py-32 text-center space-y-8 animate-in zoom-in duration-700">
                <div class="relative inline-block">
                    <div class="absolute -inset-4 bg-red-500/10 rounded-full blur-2xl animate-pulse"></div>
                    <div class="relative p-10 bg-white border border-red-100 rounded-[50px] shadow-2xl">
                        <i data-lucide="alert-triangle" class="w-20 h-20 text-red-500"></i>
                    </div>
                </div>
                <div class="space-y-4">
                    <h2 class="text-3xl font-black font-jogos text-slate-800 uppercase tracking-tighter italic">Erro de Sincronia</h2>
                    <p class="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">${provavelState.error}</p>
                </div>
                <button onclick="window.renderProvaveis()" class="group relative px-12 py-5 bg-slate-900 rounded-3xl font-black font-jogos text-[10px] tracking-[0.3em] text-white shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase">
                    <span class="relative z-10">Tentar Novamente</span>
                    <div class="absolute inset-0 bg-orange-600 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
            </div>
        `;
        if (typeof lucide !== "undefined") lucide.createIcons();
        return;
    }

    main.innerHTML = `
        <div class="max-w-7xl mx-auto pb-48 pt-2 px-4 md:px-8 space-y-8 animate-in fade-in duration-1000">
            <!-- Header Section -->
            <div class="text-center space-y-1 mb-2">
                <h2 class="font-jogos text-4xl md:text-6xl text-slate-900 leading-none tracking-tighter uppercase italic">QUEM <span class="text-orange-500">JOGA?</span></h2>
                <p class="text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase">ESCALAÇÕES PROVÁVEIS - ${provavelState.partidasData.rodada || ''}ª RODADA</p>
            </div>

            ${renderShieldsContainer()}
            
            <div class="relative">
                ${renderLineupCards()}
            </div>
        </div>
    `;

    if (typeof lucide !== "undefined") lucide.createIcons();
};

window.abrirModalJogador = function(id, timeId) {
    console.log("Modal jogador:", id, timeId);
    // Future implementation
};

console.log("✅ provaveis.js - V.Final Reiniciado com Sucesso");
