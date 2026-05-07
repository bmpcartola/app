/* ============================================================
   PROVÁVEIS ESCALAÇÕES — VERSÃO COMPLETA (MODAL + AJUSTES)
   ============================================================ */

const PROXY_URL_PROVAVEIS = 'https://proxy-f5nr.onrender.com';

let provavelState = {
    partidasData: null,
    lineupsData: null,
    mercadoData: null,      // Map<atleta_id, info>
    teamUpdatesData: null,
    loading: false,
    error: null
};

const SLUG_TO_ID_MAP = {
    corinthians_v2: 264, palmeiras_v2: 275, flamengo_v2: 262, vasco_v2: 267,
    'atletico-mg_v2': 282, cruzeiro_v2: 283, gremio_v2: 284, internacional_v2: 285,
    botafogo_v2: 263, fluminense_v2: 266, 'sao-paulo_v2': 276, santos_v2: 277,
    bragantino_v2: 280, 'athletico-pr_v2': 293, bahia_v2: 265, vitoria_v2: 287,
    mirassol_v2: 2305, chapecoense_v2: 315, coritiba_v2: 294, remo_v2: 364
};

// Mapeamento das posições (conforme API Cartola)
const POSICOES_MAP = {
    1: { nome: "Goleiro", abrev: "GOL" },
    2: { nome: "Lateral", abrev: "LAT" },
    3: { nome: "Zagueiro", abrev: "ZAG" },
    4: { nome: "Meia", abrev: "MEI" },
    5: { nome: "Atacante", abrev: "ATA" },
    6: { nome: "Técnico", abrev: "TEC" }
};

async function fetchProvaveisData() {
    provavelState.loading = true;
    provavelState.error = null;
    
    try {
        const partidasRes = await fetch(`${PROXY_URL_PROVAVEIS}/partidas`);
        if (!partidasRes.ok) throw new Error("Erro ao carregar partidas");
        provavelState.partidasData = await partidasRes.json();

        const lineupsRes = await fetch(`${PROXY_URL_PROVAVEIS}/provaveis/lineups`);
        if (lineupsRes.ok) provavelState.lineupsData = await lineupsRes.json();
        
        const mercadoRes = await fetch(`${PROXY_URL_PROVAVEIS}/provaveis/mercado-images`);
        if (mercadoRes.ok) {
            const mercadoArray = await mercadoRes.json();
            provavelState.mercadoData = new Map();
            mercadoArray.forEach(item => provavelState.mercadoData.set(item.atleta_id, item));
        }

        const updatesRes = await fetch(`${PROXY_URL_PROVAVEIS}/provaveis/team-updates`);
        if (updatesRes.ok) {
            provavelState.teamUpdatesData = await updatesRes.json();
        }
    } catch (err) {
        console.error("❌ Erro:", err);
        provavelState.error = err.message;
    } finally {
        provavelState.loading = false;
    }
}

function getTeamShield(teamId) {
    return `images/escudos_brasileirao/${teamId}.png`;
}

function formatarDataAtualizacao(lastUpdate) {
    if (!lastUpdate) return null;
    try {
        const now = new Date();
        const dt = new Date(lastUpdate);
        const pad = n => String(n).padStart(2, '0');
        const hhmm = pad(dt.getHours()) + ':' + pad(dt.getMinutes());
        if (now.toDateString() === dt.toDateString()) return `Hoje ${hhmm}`;
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        if (yest.toDateString() === dt.toDateString()) return `Ontem ${hhmm}`;
        return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)} ${hhmm}`;
    } catch (e) {
        return null;
    }
}

function renderShieldsContainer() {
    if (!provavelState.partidasData?.partidas) return '';
    return `
        <div class="bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 p-8 shadow-sm mb-6">
            <p class="text-[10px] font-black font-jogos text-slate-400 tracking-[0.3em] mb-6 uppercase text-center">Partidas da Rodada</p>
            <div class="flex flex-wrap items-center justify-start gap-4 md:gap-6">
                ${provavelState.partidasData.partidas.map((match, idx) => `
                    <div class="flex items-center gap-1">
                        <button onclick="scrollToTeamField(${idx}, ${match.clube_casa_id})" class="w-10 h-10 md:w-12 md:h-12 p-1.5 bg-white rounded-xl border hover:border-orange-300 transition-all shadow-sm hover:scale-110">
                            <img src="${getTeamShield(match.clube_casa_id)}" onerror="this.src='https://s.glbimg.com/es/sde/f/equipes/2018/03/12/identidade-visual-60x60.png'">
                        </button>
                        <button onclick="scrollToTeamField(${idx}, ${match.clube_visitante_id})" class="w-10 h-10 md:w-12 md:h-12 p-1.5 bg-white rounded-xl border hover:border-orange-300 transition-all shadow-sm hover:scale-110">
                            <img src="${getTeamShield(match.clube_visitante_id)}" onerror="this.src='https://s.glbimg.com/es/sde/f/equipes/2018/03/12/identidade-visual-60x60.png'">
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderDots(results) {
    if (!results || !Array.isArray(results)) return '<div class="h-1.5 mb-1"></div>';
    return `<div class="flex gap-0.5 justify-center mb-1">${results.map(res => {
        let color = res === 'v' ? 'bg-emerald-500' : (res === 'd' ? 'bg-red-500' : 'bg-slate-300');
        return `<div class="w-1.5 h-1.5 rounded-full ${color}"></div>`;
    }).join('')}</div>`;
}

function renderFieldPlayers(lineup, teamId) {
    if (!lineup?.titulares) return '';
    return lineup.titulares.filter(p => p.slot !== 'TEC').map(p => {
        const playerInfo = provavelState.mercadoData?.get(p.id);
        // Usa apelido_abreviado (ex: "Y. Alberto") ou fallback
        const nome = playerInfo?.apelido_abreviado || playerInfo?.apelido || playerInfo?.nome || '...';
        const nomeArquivo = playerInfo?.apelido || playerInfo?.nome || '';
        const nomeArquivoClean = nomeArquivo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const fotoLocal = nomeArquivoClean ? `images/jogadores/${p.id}_${nomeArquivoClean}.webp` : null;
        const fotoProxy = playerInfo?.foto || '';
        const isDuvida = p.sit === 'duvida';
        const onClick = `onclick="event.stopPropagation(); window.abrirModalJogador(${p.id}, ${teamId})"`;
        return `
            <div class="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
                 style="left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%); z-index: 10;" ${onClick}>
                <!-- IMAGEM 2x MAIOR -->
                <div class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/95 p-1 shadow-sm border ${isDuvida ? 'border-orange-500' : 'border-white'}">
                    <img src="${fotoLocal || fotoProxy}" class="w-full h-full object-contain rounded-full"
                         onerror="this.onerror=null; this.src='${getTeamShield(teamId)}'">
                </div>
                <!-- NOME ABAIXO (apelido_abreviado) -->
                <div class="mt-1 bg-black/60 backdrop-blur-[1px] px-1.5 py-0.5 rounded-md max-w-[60px] md:max-w-[80px] truncate border border-white/10">
                    <p class="text-[8px] md:text-[10px] font-black text-white uppercase leading-none text-center truncate">${nome}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderMiniField(matchIdx, teamId) {
    const slug = Object.keys(SLUG_TO_ID_MAP).find(key => SLUG_TO_ID_MAP[key] === teamId);
    const lineup = slug ? provavelState.lineupsData?.teams?.[slug] : null;
    const lastUpdate = slug ? provavelState.teamUpdatesData?.teams?.[slug]?.last_update : null;
    const fmtUpdate = formatarDataAtualizacao(lastUpdate);
    
    const playersHtml = lineup ? renderFieldPlayers(lineup, teamId) : `
        <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-[8px] font-black font-jogos text-white/20 uppercase tracking-[0.2em] -rotate-12">Escalação em breve</span>
        </div>
    `;

    return `
        <div id="field-${matchIdx}-${teamId}" class="relative w-full aspect-[4/5] bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-2xl overflow-hidden shadow-inner border border-emerald-900/20">
            <!-- ÚLTIMA ATUALIZAÇÃO (canto superior esquerdo) -->
            ${fmtUpdate ? `
                <div class="absolute top-2 left-2 z-20 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <p class="text-[8px] font-mono text-white/80">🔄 ${fmtUpdate}</p>
                </div>
            ` : ''}
            <div class="absolute inset-4 border-2 border-white/10 pointer-events-none opacity-40"></div>
            <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 pointer-events-none"></div>
            <div class="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40"></div>
            <div class="absolute top-3 left-3 w-12 h-12 md:w-20 md:h-20 opacity-40 drop-shadow-2xl pointer-events-none">
                <img src="${getTeamShield(teamId)}" class="w-full h-full object-contain grayscale brightness-200">
            </div>
            ${playersHtml}
        </div>
    `;
}

function renderLineupCards() {
    if (!provavelState.partidasData?.partidas) return '';
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            ${provavelState.partidasData.partidas.map((match, idx) => {
                const clubeCasa = provavelState.partidasData.clubes[match.clube_casa_id];
                const clubeVisitante = provavelState.partidasData.clubes[match.clube_visitante_id];
                const dataPartida = new Date(match.partida_data);
                const dataFormatada = dataPartida.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
                const horaFormatada = dataPartida.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
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
                        <!-- LOCAL & HORÁRIO FORMATADO (conforme solicitado) -->
                        <div class="px-3 py-2 bg-slate-50 rounded-xl text-left mb-2">
                            <p class="text-sm md:text-base font-bold text-slate-700"><span class="font-mono text-slate-500">LOCAL:</span> ${match.local || 'Estádio a definir'}</p>
                            <p class="text-sm md:text-base font-mono font-bold text-orange-500 mt-1"><span class="font-mono text-slate-500">HORÁRIO:</span> ${horaFormatada} - ${dataFormatada}</p>
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

window.scrollToTeamField = (matchIdx, teamId) => {
    const el = document.getElementById(`field-${matchIdx}-${teamId}`);
    if (el) {
        const offset = 150;
        const elementPosition = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
        el.classList.add('ring-4', 'ring-orange-500', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-4', 'ring-orange-500', 'ring-offset-2'), 2000);
    }
};

// ======================== MODAL COMPLETO ========================
window.fecharModalJogador = function() {
    const modal = document.getElementById('modal-jogador-scout');
    if (modal) modal.remove();
};

window.abrirModalJogador = function(jogadorId, timeId) {
    const playerInfo = provavelState.mercadoData?.get(jogadorId);
    if (!playerInfo) {
        alert(`Dados do jogador ${jogadorId} não disponíveis.`);
        return;
    }

    // Dados básicos
    const nome = playerInfo.apelido_abreviado || playerInfo.apelido || playerInfo.nome || `Jogador ${jogadorId}`;
    const foto = playerInfo.foto || getTeamShield(timeId);
    const posicaoId = playerInfo.posicao_id;
    const posicaoAbrev = POSICOES_MAP[posicaoId]?.abrev || '?';

    // Dados financeiros e estatísticas
    const preco = playerInfo.preco_num ? `R$ ${playerInfo.preco_num.toFixed(2)}` : 'R$ --';
    const variacao = playerInfo.variacao_num || 0;
    const variacaoStr = variacao > 0 ? `+${variacao.toFixed(2)}` : variacao.toFixed(2);
    const corVar = variacao > 0 ? 'text-green-500' : (variacao < 0 ? 'text-red-500' : 'text-gray-400');
    const jogos = playerInfo.jogos_num || 0;
    const ultima = playerInfo.pontos_num !== undefined ? playerInfo.pontos_num.toFixed(1) : '-';
    const media = playerInfo.media_num ? playerInfo.media_num.toFixed(1) : '0.0';
    // MPV e CEDIDO ainda não disponíveis nesta API
    const mpv = '--';
    const pt_ced = '--';

    // Scouts (diretamente do campo "scout" do jogador)
    const scouts = playerInfo.scout || {};
    const ata = {
        G: scouts.G || 0,
        A: scouts.A || 0,
        FT: scouts.FT || 0,
        FD: scouts.FD || 0,
        FF: scouts.FF || 0,
        FS: scouts.FS || 0,
        PS: scouts.PS || 0,
        V: scouts.V || 0,
        I: scouts.I || 0,
        PP: scouts.PP || 0
    };
    const def = {
        DS: scouts.DS || 0,
        SG: scouts.SG || 0,
        DE: scouts.DE || 0,
        DP: scouts.DP || 0,
        CV: scouts.CV || 0,
        CA: scouts.CA || 0,
        FC: scouts.FC || 0,
        GC: scouts.GC || 0,
        GS: scouts.GS || 0,
        PC: scouts.PC || 0
    };

    const ataques = [
        { label: "G", val: ata.G, red: false }, { label: "A", val: ata.A, red: false },
        { label: "FT", val: ata.FT, red: false }, { label: "FD", val: ata.FD, red: false },
        { label: "FF", val: ata.FF, red: false }, { label: "FS", val: ata.FS, red: false },
        { label: "PS", val: ata.PS, red: false }, { label: "V", val: ata.V, red: false },
        { label: "I", val: ata.I, red: true }, { label: "PP", val: ata.PP, red: true }
    ];
    const defesas = [
        { label: "DS", val: def.DS, red: false }, { label: "SG", val: def.SG, red: false },
        { label: "DE", val: def.DE, red: false }, { label: "DP", val: def.DP, red: false },
        { label: "CV", val: def.CV, red: true }, { label: "CA", val: def.CA, red: true },
        { label: "FC", val: def.FC, red: true }, { label: "GC", val: def.GC, red: true },
        { label: "GS", val: def.GS, red: true }, { label: "PC", val: def.PC, red: true }
    ];

    const renderScoutCell = (label, val, isRed) => `
        <div class="${isRed ? 'bg-red-100' : 'bg-green-100'} rounded-md p-1 text-center min-w-[40px]">
            <div class="text-[9px] font-bold uppercase text-gray-600">${label}</div>
            <div class="text-sm font-black text-gray-800">${val}</div>
        </div>
    `;

    // Gráfico placeholder (histórico de pontuações virá de outra API)
    const graficoHtml = `
        <div class="flex items-end justify-between h-[85px] w-full px-1">
            <div class="w-full text-center text-[10px] text-gray-400">Dados de pontuação por rodada em breve</div>
        </div>
    `;

    window.fecharModalJogador();
    const modalHtml = `
        <div id="modal-jogador-scout" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onclick="if(event.target === this) window.fecharModalJogador()">
            <div class="relative w-full max-w-md mx-3 bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                <button onclick="window.fecharModalJogador()" class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div class="bg-gradient-to-r from-orange-50 to-white p-4 border-b border-orange-100">
                    <div class="flex items-center gap-3">
                        <div class="w-16 h-16 bg-white rounded-full p-1 shadow-md border border-orange-200">
                            <img src="${foto}" class="w-full h-full object-contain rounded-full">
                        </div>
                        <div>
                            <h3 class="text-xl uppercase tracking-wide text-gray-800 font-jogos">${nome}</h3>
                            <p class="text-xs font-mono text-gray-500">${posicaoAbrev}</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 space-y-3">
                    <div class="flex items-center justify-between bg-black/[0.02] rounded-xl p-2">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-sm">R$</div>
                            <div><p class="text-[10px] text-gray-400 uppercase">Preço</p><p class="text-lg font-black text-gray-900">${preco}</p></div>
                        </div>
                        <div class="text-right"><p class="text-[10px] text-gray-400 uppercase">Variação</p><p class="text-base font-black ${corVar}">${variacaoStr}</p></div>
                    </div>
                    <div class="grid grid-cols-5 gap-1 bg-black/[0.02] rounded-xl p-2 text-center">
                        <div><p class="text-[9px] text-gray-400">JOGOS</p><p class="text-base font-black">${jogos}</p></div>
                        <div><p class="text-[9px] text-gray-400">ÚLT.</p><p class="text-base font-black">${ultima}</p></div>
                        <div><p class="text-[9px] text-gray-400">MÉDIA</p><p class="text-base font-black">${media}</p></div>
                        <div><p class="text-[9px] text-gray-400">MPV</p><p class="text-base font-black">${mpv}</p></div>
                        <div><p class="text-[9px] text-gray-400">CEDIDO</p><p class="text-base font-black">${pt_ced}</p></div>
                    </div>
                    <div class="bg-black/[0.02] rounded-xl p-2">
                        <p class="text-[10px] font-black uppercase text-gray-600 mb-2">ATAQUE</p>
                        <div class="flex flex-wrap gap-1">${ataques.map(a => renderScoutCell(a.label, a.val, a.red)).join('')}</div>
                    </div>
                    <div class="bg-black/[0.02] rounded-xl p-2">
                        <p class="text-[10px] font-black uppercase text-gray-600 mb-2">DEFESA</p>
                        <div class="flex flex-wrap gap-1">${defesas.map(d => renderScoutCell(d.label, d.val, d.red)).join('')}</div>
                    </div>
                    <div class="bg-black/[0.02] rounded-xl p-3">
                        <p class="text-[10px] font-black uppercase text-gray-600 mb-3 text-center">ÚLTIMAS PONTUAÇÕES</p>
                        ${graficoHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// ======================== FUNÇÃO PRINCIPAL ========================
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
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-20 h-20 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
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

    const rodada = provavelState.partidasData.rodada_id || '';
    main.innerHTML = `
        <div class="max-w-7xl mx-auto pb-48 pt-2 px-4 md:px-8 space-y-8 animate-in fade-in duration-1000">
            <div class="text-center space-y-1 mb-2">
                <h2 class="font-jogos text-4xl md:text-6xl text-slate-900 leading-none tracking-tighter uppercase italic">QUEM <span class="text-orange-500">JOGA?</span></h2>
                <p class="text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase">ESCALAÇÕES PROVÁVEIS - ${rodada}ª RODADA</p>
            </div>
            ${renderShieldsContainer()}
            <div class="relative">${renderLineupCards()}</div>
        </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
};

console.log("✅ provaveis.js carregado (modal completo, imagens maiores, local/horário formatado)");
