/* ============================================================
   PROVÁVEIS ESCALAÇÕES – VERSÃO FINAL (TODAS CORREÇÕES)
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

const POSICOES_MAP = {
    1: "GOL", 2: "LAT", 3: "ZAG", 4: "MEI", 5: "ATA", 6: "TEC"
};

async function fetchProvaveisData() {
    provavelState.loading = true;
    provavelState.error = null;
    try {
        // 🔥 Requisições paralelas (mais rápido)
        const [partidasRes, lineupsRes, mercadoRes, updatesRes] = await Promise.all([
            fetch(`${PROXY_URL_PROVAVEIS}/partidas`),
            fetch(`${PROXY_URL_PROVAVEIS}/provaveis/lineups`),
            fetch(`${PROXY_URL_PROVAVEIS}/provaveis/mercado-images`),
            fetch(`${PROXY_URL_PROVAVEIS}/provaveis/team-updates`)
        ]);

        if (!partidasRes.ok) throw new Error("Falha partidas");
        provavelState.partidasData = await partidasRes.json();

        if (lineupsRes.ok) provavelState.lineupsData = await lineupsRes.json();
        
        if (mercadoRes.ok) {
            const arr = await mercadoRes.json();
            provavelState.mercadoData = new Map(arr.map(i => [i.atleta_id, i]));
        }

        if (updatesRes.ok) provavelState.teamUpdatesData = await updatesRes.json();

    } catch (err) {
        console.error(err);
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
        const dt = new Date(lastUpdate);
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const hhmm = pad(dt.getHours()) + ':' + pad(dt.getMinutes());
        if (now.toDateString() === dt.toDateString()) return `Hoje ${hhmm}`;
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        if (yest.toDateString() === dt.toDateString()) return `Ontem ${hhmm}`;
        return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)} ${hhmm}`;
    } catch(e) { return null; }
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

// 🔥 Função para obter nome do jogador (usada para dúvida)
function getNomeJogador(id) {
    const info = provavelState.mercadoData?.get(id);
    return info?.apelido_abreviado || info?.apelido || info?.nome || `#${id}`;
}

function renderFieldPlayers(lineup, teamId) {
    if (!lineup?.titulares) return '';
    return lineup.titulares
        .filter(p => p.slot !== 'TEC')
        .map(p => {
            const playerInfo = provavelState.mercadoData?.get(p.id);
            const nome = playerInfo?.apelido_abreviado || playerInfo?.apelido || playerInfo?.nome || '...';
            const nomeArquivo = (playerInfo?.apelido || playerInfo?.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const fotoLocal = nomeArquivo ? `images/jogadores/${p.id}_${nomeArquivo}.webp` : null;
            const fotoProxy = playerInfo?.foto || '';
            const isDuvida = p.sit === 'duvida';
            const onClick = `onclick="event.stopPropagation(); window.abrirModalJogador(${p.id}, ${teamId})"`;
            
            // 🔥 Nome do jogador que entra na dúvida
            let duvidaComNome = '';
            if (isDuvida && p.duvida_com) {
                duvidaComNome = getNomeJogador(p.duvida_com);
            }
            
            return `
                <div class="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
                     style="left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%); z-index: 10;" ${onClick}>
                    <!-- 🔥 BORDA DE DÚVIDA MAIS VISÍVEL: 3px laranja com brilho -->
                        <div class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/95 p-1 shadow-sm ${isDuvida ? 'ring-3 ring-orange-500 ring-offset-2 shadow-lg shadow-orange-500/50 border-2 border-orange-300' : 'border border-white'}">
                        <img src="${fotoLocal || fotoProxy}" class="w-full h-full object-contain rounded-full"
                             onerror="this.onerror=null; this.src='${getTeamShield(teamId)}'">
                    </div>
                    <div class="mt-1 bg-black/60 backdrop-blur-[1px] px-1.5 py-0.5 rounded-md max-w-[60px] md:max-w-[80px] truncate border border-white/10">
                        <p class="text-[8px] md:text-[10px] font-black text-white uppercase leading-none text-center truncate">${nome}</p>
                    </div>
                    ${isDuvida && duvidaComNome ? `
                        <div class="mt-0.5 bg-black/40 backdrop-blur-[1px] px-1.5 py-0.5 rounded-md max-w-[70px] md:max-w-[90px] truncate">
                            <p class="text-[7px] md:text-[9px] font-medium text-orange-300 uppercase leading-none text-center truncate">⇄ ${duvidaComNome}</p>
                        </div>
                    ` : ''}
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
            ${fmtUpdate ? `<div class="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full"><p class="text-[8px] font-mono text-white/80">🔄 ${fmtUpdate}</p></div>` : ''}
            <div class="absolute inset-4 border-2 border-white/10 pointer-events-none opacity-40"></div>
            <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2"></div>
            <div class="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-40"></div>
            <div class="absolute top-3 left-3 w-12 h-12 md:w-20 md:h-20 opacity-40 drop-shadow-2xl">
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
                const dataPartida = new Date(match.partida_data);
                const dataFormatada = dataPartida.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
                const horaFormatada = dataPartida.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
                return `
                <div id="match-card-${idx}" class="bg-white rounded-[40px] border border-slate-100 p-2.5 md:p-4 shadow-sm hover:shadow-xl transition-all">
                    <!-- 🔥 CABEÇALHO: Posição ajustada conforme mandante/visitante -->
                    <div class="flex items-center justify-between mb-4 gap-2">
                        <!-- Time da Casa: posição à esquerda do escudo -->
                        <div class="flex items-center gap-2 flex-1 justify-end">
                            <span class="font-jersey text-2xl md:text-3xl text-slate-200">${parseInt(match.clube_casa_posicao)}</span>
                            <div class="w-12 h-12 md:w-16 md:h-16 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                <img src="${getTeamShield(match.clube_casa_id)}" class="w-full h-full object-contain">
                            </div>
                        </div>
                        <!-- VS central -->
                        <div class="flex flex-col items-center px-2">
                            <span class="text-slate-300 font-black font-jogos italic text-sm md:text-base">VS</span>
                        </div>
                        <!-- Time Visitante: escudo + posição à direita -->
                        <div class="flex items-center gap-2 flex-1">
                            <div class="w-12 h-12 md:w-16 md:h-16 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                <img src="${getTeamShield(match.clube_visitante_id)}" class="w-full h-full object-contain">
                            </div>
                            <span class="font-jersey text-2xl md:text-3xl text-slate-200">${parseInt(match.clube_visitante_posicao)}</span>
                        </div>
                    </div>

                    <div class="mt-2">
                        <!-- 🔥 LOCAL E HORÁRIO: Fonte mono unificada e cores ajustadas -->
                        <div class="bg-slate-50 rounded-xl px-3 py-2 text-left mb-2 text-[10px] md:text-xs font-mono text-slate-500 border border-slate-100 uppercase tracking-tight">
                            <div><span class="font-bold">LOCAL:</span> <span class="text-orange-600 ml-1">${match.local || 'Estádio a definir'}</span></div>
                            <div class="mt-0.5"><span class="font-bold">HORÁRIO:</span> <span class="text-orange-600 ml-1">${horaFormatada} - ${dataFormatada}</span></div>
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

// ======================== MODAL ========================
window.fecharModalJogador = function() {
    const modal = document.getElementById('modal-jogador-scout');
    if (modal) modal.remove();
};

window.abrirModalJogador = async function(jogadorId, timeId) {
    try {
        // Busca o atleta na API de mercado (garante dados atualizados)
        const response = await fetch(`${PROXY_URL_PROVAVEIS}/mercado`);
        if (!response.ok) throw new Error("Falha ao carregar mercado");
        const data = await response.json();
        const atleta = data.atletas?.find(a => a.atleta_id == jogadorId);
        if (!atleta) throw new Error("Jogador não encontrado");

        // 🔥 FOTO: usa a foto do atleta, fallback escudo do time
        const foto = atleta.foto && atleta.foto.startsWith('http') ? atleta.foto : getTeamShield(timeId);
        
        const nome = atleta.apelido_abreviado || atleta.apelido || atleta.nome || `#${jogadorId}`;
        const posAbrev = POSICOES_MAP[atleta.posicao_id] || '?';
        const preco = atleta.preco_num ? `R$ ${atleta.preco_num.toFixed(2)}` : 'R$ --';
        const variacao = atleta.variacao_num || 0;
        const variacaoStr = variacao > 0 ? `+${variacao.toFixed(2)}` : variacao.toFixed(2);
        const corVar = variacao > 0 ? 'text-green-500' : (variacao < 0 ? 'text-red-500' : 'text-gray-400');
        const jogos = atleta.jogos_num || 0;
        const ultima = atleta.pontos_num !== undefined ? atleta.pontos_num.toFixed(1) : '-';
        const media = atleta.media_num ? atleta.media_num.toFixed(1) : '0.0';
        const mpv = '--';
        const pt_ced = '--';

        const scout = atleta.scout || {};
        const ataque = {
            G: scout.G || 0, A: scout.A || 0, FT: scout.FT || 0, FD: scout.FD || 0,
            FF: scout.FF || 0, FS: scout.FS || 0, PS: scout.PS || 0, V: scout.V || 0,
            I: scout.I || 0, PP: scout.PP || 0
        };
        const defesa = {
            DS: scout.DS || 0, SG: scout.SG || 0, DE: scout.DE || 0, DP: scout.DP || 0,
            CV: scout.CV || 0, CA: scout.CA || 0, FC: scout.FC || 0, GC: scout.GC || 0,
            GS: scout.GS || 0, PC: scout.PC || 0
        };

        const ataques = [
            { label: "G", val: ataque.G, red: false }, { label: "A", val: ataque.A, red: false },
            { label: "FT", val: ataque.FT, red: false }, { label: "FD", val: ataque.FD, red: false },
            { label: "FF", val: ataque.FF, red: false }, { label: "FS", val: ataque.FS, red: false },
            { label: "PS", val: ataque.PS, red: false }, { label: "V", val: ataque.V, red: false },
            { label: "I", val: ataque.I, red: true }, { label: "PP", val: ataque.PP, red: true }
        ];
        const defesas = [
            { label: "DS", val: defesa.DS, red: false }, { label: "SG", val: defesa.SG, red: false },
            { label: "DE", val: defesa.DE, red: false }, { label: "DP", val: defesa.DP, red: false },
            { label: "CV", val: defesa.CV, red: true }, { label: "CA", val: defesa.CA, red: true },
            { label: "FC", val: defesa.FC, red: true }, { label: "GC", val: defesa.GC, red: true },
            { label: "GS", val: defesa.GS, red: true }, { label: "PC", val: defesa.PC, red: true }
        ];

        const renderCell = (label, val, isRed) => `
            <div class="${isRed ? 'bg-red-100' : 'bg-green-100'} rounded-md p-1 text-center min-w-[40px]">
                <div class="text-[9px] font-bold uppercase text-gray-600">${label}</div>
                <div class="text-sm font-black text-gray-800">${val}</div>
            </div>
        `;

        const graficoPlaceholder = `
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
                                <p class="text-xs font-mono text-gray-500">${posAbrev}</p>
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
                            <div class="flex flex-wrap gap-1">${ataques.map(a => renderCell(a.label, a.val, a.red)).join('')}</div>
                        </div>
                        <div class="bg-black/[0.02] rounded-xl p-2">
                            <p class="text-[10px] font-black uppercase text-gray-600 mb-2">DEFESA</p>
                            <div class="flex flex-wrap gap-1">${defesas.map(d => renderCell(d.label, d.val, d.red)).join('')}</div>
                        </div>
                        <div class="bg-black/[0.02] rounded-xl p-3">
                            <p class="text-[10px] font-black uppercase text-gray-600 mb-3 text-center">ÚLTIMAS PONTUAÇÕES</p>
                            ${graficoPlaceholder}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (err) {
        console.error(err);
        alert(`Erro ao carregar dados do jogador: ${err.message}`);
    }
};

window.renderProvaveis = async function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // 1. MOSTRA O LOADER IMEDIATAMENTE (tela de prováveis já aparece)
    main.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div class="loader"></div>
            <div class="text-center">
                <p class="text-slate-400 font-jogos text-xs tracking-[0.4em] uppercase animate-pulse">Aguenta aí.</p>
                <p class="text-[10px] font-mono text-slate-300 mt-2 uppercase tracking-widest">Tá quase...</p>
            </div>
        </div>
    `;

    // 2. CARREGA OS DADOS EM PARALELO (mais rápido)
    await fetchProvaveisData();

    // 3. SE HOUVER ERRO, MOSTRA MENSAGEM
    if (provavelState.error) {
        main.innerHTML = `<div class="max-w-xl mx-auto py-32 text-center"><p class="text-red-500">Erro: ${provavelState.error}</p><button onclick="window.renderProvaveis()" class="mt-4 px-6 py-2 bg-black text-white rounded-full">Tentar novamente</button></div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();
        return;
    }

    // 4. RENDERIZA O CONTEÚDO FINAL
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

console.log("✅ provaveis.js carregado – versão final com todas as correções");
