/* ===================================================================
   PROVÁVEIS ESCALAÇÕES 
   =================================================================== */

const PROXY_URL = 'https://proxy-f5nr.onrender.com'; // <-- Ajuste se necessário

let provavelState = {
    partidasData: null,
    lineupsData: null,
    mercadoData: null,      // Map<atleta_id, info>
    teamUpdatesData: null,
    loading: false,
    error: null
};

// Mapeamento slugs -> IDs do Cartola (para encontrar a escalação de cada time)
const SLUG_TO_ID_MAP = {
    corinthians_v2: 264, palmeiras_v2: 275, flamengo_v2: 262, vasco_v2: 267,
    'atletico-mg_v2': 282, cruzeiro_v2: 283, gremio_v2: 284, internacional_v2: 285,
    botafogo_v2: 263, fluminense_v2: 266, 'sao-paulo_v2': 276, santos_v2: 277,
    bragantino_v2: 280, 'athletico-pr_v2': 293, bahia_v2: 265, vitoria_v2: 287,
    mirassol_v2: 2305, chapecoense_v2: 315, coritiba_v2: 294, remo_v2: 364
};

// ======================== BUSCA DOS DADOS ========================
async function fetchProvaveisData() {
    provavelState.loading = true;
    provavelState.error = null;

    console.log("🚀 Iniciando carregamento dos dados...");

    try {
        // 1) Partidas
        console.log("📡 Buscando partidas em:", `${PROXY_URL}/partidas`);
        const partidasRes = await fetch(`${PROXY_URL}/partidas`);
        if (!partidasRes.ok) throw new Error(`HTTP ${partidasRes.status} - Erro nas partidas`);
        provavelState.partidasData = await partidasRes.json();
        console.log("✅ Partidas carregadas. Rodada:", provavelState.partidasData?.rodada_id);

        // 2) Escalações
        console.log("📡 Buscando escalações em:", `${PROXY_URL}/provaveis/lineups`);
        const lineupsRes = await fetch(`${PROXY_URL}/provaveis/lineups`);
        if (!lineupsRes.ok) throw new Error(`HTTP ${lineupsRes.status} - Erro nas escalações`);
        provavelState.lineupsData = await lineupsRes.json();
        console.log("✅ Escalações carregadas.");

        // 3) Dados do mercado (fotos, apelidos)
        console.log("📡 Buscando dados de mercado em:", `${PROXY_URL}/provaveis/mercado-images`);
        const mercadoRes = await fetch(`${PROXY_URL}/provaveis/mercado-images`);
        if (mercadoRes.ok) {
            const mercadoArray = await mercadoRes.json();
            provavelState.mercadoData = new Map();
            mercadoArray.forEach(item => provavelState.mercadoData.set(item.atleta_id, item));
            console.log("✅ Mercado carregado:", provavelState.mercadoData.size, "jogadores");
        } else {
            console.warn("⚠️ Mercado não disponível.");
        }

        // 4) Atualizações (opcional)
        try {
            const updatesRes = await fetch(`${PROXY_URL}/provaveis/team-updates`);
            if (updatesRes.ok) provavelState.teamUpdatesData = await updatesRes.json();
        } catch (e) { console.warn("⚠️ Team updates ignorado."); }

    } catch (err) {
        console.error("❌ Erro crítico em fetchProvaveisData:", err);
        provavelState.error = err.message || "Falha na comunicação com o proxy";
    } finally {
        provavelState.loading = false;
    }
}

// ======================== AUXILIARES DE RENDER ========================
function getTeamShield(teamId) {
    return `images/escudos_brasileirao/${teamId}.png`;
}

function renderDots(results) {
    if (!results || !Array.isArray(results)) return '<div class="h-1.5 mb-1"></div>';
    return `<div class="flex gap-0.5 justify-center mb-1">${results.map(res => {
        let color = res === 'v' ? 'bg-emerald-500' : (res === 'd' ? 'bg-red-500' : 'bg-slate-300');
        return `<div class="w-1.5 h-1.5 rounded-full ${color}"></div>`;
    }).join('')}</div>`;
}

// Nome do jogador (prioriza proxy, depois JOGADORES se existir)
function getPlayerName(id, playerInfo) {
    if (playerInfo?.apelido_abreviado) return playerInfo.apelido_abreviado;
    if (playerInfo?.apelido) return playerInfo.apelido;
    if (playerInfo?.nome) return playerInfo.nome;
    if (typeof JOGADORES !== 'undefined' && JOGADORES[id] && JOGADORES[id].slug) {
        return JOGADORES[id].slug.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return `#${id}`;
}

// Nome abreviado para exibição no campo
function abreviarNome(nomeCompleto) {
    if (!nomeCompleto) return '...';
    const partes = nomeCompleto.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 8);
    return partes[0].charAt(0).toUpperCase() + '. ' + partes.slice(1).join(' ').substring(0, 12);
}

function getNomeArquivoJogador(id, playerInfo) {
    let nomeBase = playerInfo?.apelido_ou_nome || playerInfo?.apelido || playerInfo?.nome;
    if (typeof JOGADORES !== 'undefined' && JOGADORES[id] && JOGADORES[id].slug) {
        nomeBase = JOGADORES[id].slug;
    }
    if (!nomeBase) return '';
    return nomeBase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Renderiza os jogadores no campo
function renderFieldPlayers(lineup, teamId) {
    if (!lineup || !lineup.titulares) return '';
    return lineup.titulares.filter(p => p.slot !== 'TEC').map(p => {
        const playerInfo = provavelState.mercadoData?.get(p.id);
        const nomeCompleto = getPlayerName(p.id, playerInfo);
        const nomeAbrev = abreviarNome(nomeCompleto);
        const nomeArquivo = getNomeArquivoJogador(p.id, playerInfo);
        const fotoLocal = nomeArquivo ? `images/jogadores/${p.id}_${nomeArquivo}.webp` : null;
        const fotoProxy = playerInfo?.foto || '';
        const isDuvida = p.sit === 'duvida';
        const onClick = `onclick="event.stopPropagation(); window.abrirModalJogador(${p.id}, ${teamId})"`;
        return `
            <div class="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
                 style="left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%); z-index: 10;" ${onClick}>
                <div class="w-6 h-6 md:w-10 md:h-10 rounded-full bg-white/95 p-0.5 shadow-sm border ${isDuvida ? 'border-orange-500' : 'border-white'}">
                    <img src="${fotoLocal || fotoProxy}" class="w-full h-full object-contain rounded-full"
                         onerror="this.onerror=null; this.src='${getTeamShield(teamId)}'">
                </div>
                <div class="mt-0.5 bg-black/60 backdrop-blur-[1px] px-1 rounded-[2px] max-w-[42px] md:max-w-[60px] truncate border border-white/10">
                    <p class="text-[4px] md:text-[6px] font-black text-white uppercase leading-none text-center truncate">${nomeAbrev}</p>
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
        <div id="field-${matchIdx}-${teamId}" class="relative w-full aspect-[4/5] bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-2xl overflow-hidden shadow-inner border border-emerald-900/20">
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
                const casa = provavelState.partidasData.clubes[match.clube_casa_id];
                const fora = provavelState.partidasData.clubes[match.clube_visitante_id];
                return `
                <div id="match-card-${idx}" class="bg-white rounded-[40px] border border-slate-100 p-2.5 md:p-4 shadow-sm hover:shadow-xl transition-all">
                    <div class="flex items-center justify-between mb-1.5 gap-1 text-center">
                        <div class="flex flex-col items-center gap-0.5 flex-1">
                            <div class="flex items-center gap-0.5">
                                <span class="font-jersey text-xl md:text-2xl text-slate-200 mt-2">${match.clube_casa_posicao}<span class="text-[0.6em]">º</span></span>
                                <div>
                                    ${renderDots(match.aproveitamento_mandante)}
                                    <div class="w-11 h-11 md:w-16 md:h-16 bg-slate-50 p-1.5 rounded-xl border">
                                        <img src="${getTeamShield(match.clube_casa_id)}" class="w-full h-full object-contain">
                                    </div>
                                </div>
                            </div>
                            <p class="font-jogos text-[7px] md:text-xs text-slate-800 uppercase truncate w-full">${casa?.nome || 'Casa'}</p>
                        </div>
                        <div class="flex flex-col items-center"><span class="text-slate-200 font-black font-jogos italic text-xs md:text-lg">VS</span></div>
                        <div class="flex flex-col items-center gap-0.5 flex-1">
                            <div class="flex items-center gap-0.5">
                                <div>
                                    ${renderDots(match.aproveitamento_visitante)}
                                    <div class="w-11 h-11 md:w-16 md:h-16 bg-slate-50 p-1.5 rounded-xl border">
                                        <img src="${getTeamShield(match.clube_visitante_id)}" class="w-full h-full object-contain">
                                    </div>
                                </div>
                                <span class="font-jersey text-xl md:text-2xl text-slate-200 mt-2">${match.clube_visitante_posicao}<span class="text-[0.6em]">º</span></span>
                            </div>
                            <p class="font-jogos text-[7px] md:text-xs text-slate-800 uppercase truncate w-full">${fora?.nome || 'Fora'}</p>
                        </div>
                    </div>
                    <div class="mt-2">
                        <div class="px-2 py-1.5 bg-slate-50 rounded-xl text-center mb-2">
                            <p class="text-[6px] font-black text-slate-400 uppercase tracking-[0.15em]">Local & Horário</p>
                            <p class="text-[8px] md:text-xs font-bold">${match.local || 'Estádio a definir'}</p>
                            <div class="h-[1px] w-3 bg-slate-200 mx-auto my-0.5"></div>
                            <p class="text-[7px] md:text-[9px] font-mono font-bold text-orange-500 uppercase">${new Date(match.partida_data).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${renderMiniField(idx, match.clube_casa_id)}
                            ${renderMiniField(idx, match.clube_visitante_id)}
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

function renderShieldsContainer() {
    if (!provavelState.partidasData?.partidas) return '';
    return `
        <div class="bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 p-8 shadow-sm mb-6">
            <p class="text-[10px] font-black font-jogos text-slate-400 tracking-[0.3em] mb-6 uppercase text-center">Partidas da Rodada</p>
            <div class="flex flex-wrap items-center justify-start gap-4 md:gap-6">
                ${provavelState.partidasData.partidas.map((match, idx) => `
                    <div class="flex items-center gap-1">
                        <button onclick="scrollToTeamField(${idx}, ${match.clube_casa_id})" class="w-10 h-10 md:w-12 md:h-12 p-1.5 bg-white rounded-xl border hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm hover:scale-110">
                            <img src="${getTeamShield(match.clube_casa_id)}" onerror="this.src='https://s.glbimg.com/es/sde/f/equipes/2018/03/12/identidade-visual-60x60.png'">
                        </button>
                        <button onclick="scrollToTeamField(${idx}, ${match.clube_visitante_id})" class="w-10 h-10 md:w-12 md:h-12 p-1.5 bg-white rounded-xl border hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm hover:scale-110">
                            <img src="${getTeamShield(match.clube_visitante_id)}" onerror="this.src='https://s.glbimg.com/es/sde/f/equipes/2018/03/12/identidade-visual-60x60.png'">
                        </button>
                    </div>
                `).join('')}
            </div>
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

// ======================== MODAL COMPLETO (com scouts e gráfico) ========================
window.abrirModalJogador = function(jogadorId, timeId) {
    const playerInfo = provavelState.mercadoData?.get(jogadorId);
    if (!playerInfo) {
        alert(`Dados do jogador ${jogadorId} não disponíveis.`);
        return;
    }

    const scoutData = (typeof SCOUTS !== 'undefined') ? SCOUTS[jogadorId] : null;
    const historicoRodadas = (typeof dadosRodadas !== 'undefined') ? dadosRodadas[jogadorId]?.scouts?.rdd : null;
    const rodadaAtual = provavelState.partidasData?.rodada_id || 14;

    const nome = playerInfo.apelido_abreviado || playerInfo.apelido || playerInfo.nome || `Jogador ${jogadorId}`;
    const foto = playerInfo.foto || getTeamShield(timeId);
    const posicao = playerInfo.posicao || '?';
    const preco = playerInfo.preco ? `R$ ${playerInfo.preco.toFixed(2)}` : 'R$ --';
    const variacao = playerInfo.variacao_num !== undefined ? playerInfo.variacao_num : 0;
    const variacaoStr = variacao > 0 ? `+${variacao.toFixed(2)}` : variacao.toFixed(2);
    const corVar = variacao > 0 ? 'text-green-500' : (variacao < 0 ? 'text-red-500' : 'text-gray-400');
    const jogos = playerInfo.jogos_num || 0;
    const media = playerInfo.media_num || 0;
    const ultima = scoutData?.ult ?? (historicoRodadas?.[rodadaAtual]?.pt ?? '-');
    const mpv = scoutData?.mpv ?? '-';
    const pt_ced = scoutData?.pt_ced ?? '-';

    const ata = scoutData?.scouts?.ata || {};
    const def = scoutData?.scouts?.def || {};

    const ataques = [
        { label: "G", val: ata.G || 0 }, { label: "A", val: ata.A || 0 },
        { label: "FT", val: ata.FT || 0 }, { label: "FD", val: ata.FD || 0 },
        { label: "FF", val: ata.FF || 0 }, { label: "FS", val: ata.FS || 0 },
        { label: "PS", val: ata.PS || 0 }, { label: "V", val: ata.V || 0 },
        { label: "I", val: ata.I || 0, red: true }, { label: "PP", val: ata.PP || 0, red: true }
    ];
    const defesas = [
        { label: "DS", val: def.DS || 0 }, { label: "SG", val: def.SG || 0 },
        { label: "DE", val: def.DE || 0 }, { label: "DP", val: def.DP || 0 },
        { label: "CV", val: def.CV || 0, red: true }, { label: "CA", val: def.CA || 0, red: true },
        { label: "FC", val: def.FC || 0, red: true }, { label: "GC", val: def.GC || 0, red: true },
        { label: "GS", val: def.GS || 0, red: true }, { label: "PC", val: def.PC || 0, red: true }
    ];

    const renderScoutCell = (label, val, isRed) => `
        <div class="${isRed ? 'bg-red-100' : 'bg-green-100'} rounded-md p-1 text-center min-w-[40px]">
            <div class="text-[9px] font-bold uppercase text-gray-600">${label}</div>
            <div class="text-sm font-black text-gray-800">${val}</div>
        </div>
    `;

    const listaRodadas = [];
    for (let r = rodadaAtual - 9; r <= rodadaAtual; r++) {
        if (r > 0) listaRodadas.push(r);
    }
    const barrasHtml = listaRodadas.map(rd => {
        let ptRaw = historicoRodadas?.[rd]?.pt;
        let pontos = '-', altura = 4, corBarra = '#e5e7eb';
        if (ptRaw !== undefined && ptRaw !== '-') {
            const v = parseFloat(ptRaw);
            pontos = v.toFixed(1);
            altura = Math.min(Math.max(Math.abs(v) * 5, 4), 50);
            corBarra = v > 0 ? '#bbf7d0' : (v < 0 ? '#fecaca' : '#e5e7eb');
        }
        return `
            <div class="flex flex-col items-center justify-end h-full flex-1" style="min-width: 22px;">
                <span style="font-size: 9px; font-weight: bold; color: #4b5563;">${pontos}</span>
                <div style="background-color: ${corBarra}; height: ${altura}px; width: 18px; border-radius: 2px 2px 0 0;"></div>
                <span style="font-size: 9px; color: #9ca3af; margin-top: 4px;">${rd}</span>
            </div>
        `;
    }).join('');

    const modalHtml = `
        <div id="modal-jogador" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onclick="if(event.target === this) fecharModal()">
            <div class="relative w-full max-w-md mx-3 bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <button onclick="fecharModal()" class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div class="bg-gradient-to-r from-orange-50 to-white p-4 border-b border-orange-100">
                    <div class="flex items-center gap-3">
                        <div class="w-16 h-16 bg-white rounded-full p-1 shadow-md border border-orange-200">
                            <img src="${foto}" class="w-full h-full object-contain rounded-full">
                        </div>
                        <div>
                            <h3 class="text-xl uppercase tracking-wide text-gray-800 font-jogos">${nome}</h3>
                            <p class="text-xs font-mono text-gray-500">${posicao}</p>
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
                        <div><p class="text-[9px] text-gray-400">MÉDIA</p><p class="text-base font-black">${media.toFixed(1)}</p></div>
                        <div><p class="text-[9px] text-gray-400">MPV</p><p class="text-base font-black">${mpv}</p></div>
                        <div><p class="text-[9px] text-gray-400">CEDIDO</p><p class="text-base font-black">${pt_ced}</p></div>
                    </div>
                    ${scoutData ? `
                        <div class="bg-black/[0.02] rounded-xl p-2">
                            <p class="text-[10px] font-black uppercase text-gray-600 mb-2">ATAQUE</p>
                            <div class="flex flex-wrap gap-1">${ataques.map(a => renderScoutCell(a.label, a.val, a.red)).join('')}</div>
                        </div>
                        <div class="bg-black/[0.02] rounded-xl p-2">
                            <p class="text-[10px] font-black uppercase text-gray-600 mb-2">DEFESA</p>
                            <div class="flex flex-wrap gap-1">${defesas.map(d => renderScoutCell(d.label, d.val, d.red)).join('')}</div>
                        </div>
                    ` : '<p class="text-center text-xs text-gray-400">Scouts não disponíveis</p>'}
                    <div class="bg-black/[0.02] rounded-xl p-3">
                        <p class="text-[10px] font-black uppercase text-gray-600 mb-3 text-center">ÚLTIMAS PONTUAÇÕES</p>
                        <div class="flex items-end justify-between h-[85px] w-full px-1">${barrasHtml}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('modal-jogador');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.fecharModal = function() {
    const modal = document.getElementById('modal-jogador');
    if (modal) modal.remove();
};

// ======================== FUNÇÃO PRINCIPAL ========================
window.renderProvaveis = async function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `<div class="flex flex-col items-center justify-center min-h-[60vh] gap-6"><div class="loader"></div><p class="text-slate-400 font-jogos text-xs uppercase animate-pulse">Sincronizando Escalações...</p></div>`;
    await fetchProvaveisData();

    if (provavelState.error) {
        main.innerHTML = `<div class="max-w-xl mx-auto py-32 text-center"><p class="text-red-500">Erro: ${provavelState.error}</p><button onclick="window.renderProvaveis()" class="mt-4 px-6 py-2 bg-black text-white rounded-full">Tentar novamente</button></div>`;
        return;
    }

    const rodadaAtual = provavelState.partidasData?.rodada_id || '';
    main.innerHTML = `
        <div class="max-w-7xl mx-auto pb-48 pt-2 px-4 md:px-8 space-y-8 animate-in fade-in duration-1000">
            <div class="text-center"><h2 class="font-jogos text-4xl md:text-6xl text-slate-900 uppercase italic">QUEM <span class="text-orange-500">JOGA?</span></h2>
            <p class="text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase">ESCALAÇÕES PROVÁVEIS - ${rodadaAtual}ª RODADA</p></div>
            ${renderShieldsContainer()}
            ${renderLineupCards()}
        </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
    console.log("✅ Renderização concluída com sucesso");
};

console.log("✅ provaveis.js carregado – aguardando chamada de renderProvaveis()");
