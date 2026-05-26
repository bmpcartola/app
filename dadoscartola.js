/* ============================================================
   DADOS CARTOLA — MOTOR ANALÍTICO
   ============================================================ */

window.analiseState = {
    rodadaAtual: 1,
    partidas: [],
    scoutSelecionado: 'GOL',
    posicaoSelecionada: 'GERAL',
    ultimasRodadas: 5,
    modoAnalise: 'MANDANTE',

    sortColumn: null,
    sortDirection: 'desc'
};

/* ============================================================
   CONFIG
   ============================================================ */

const ANALISE_PROXY = 'https://proxy-f5nr.onrender.com';

const CLUBES = {
    2305: 'MIR',
    262: 'FLA',
    263: 'BOT',
    264: 'COR',
    265: 'BAH',
    266: 'FLU',
    267: 'VAS',
    275: 'PAL',
    276: 'SAO',
    277: 'SAN',
    280: 'RBB',
    282: 'CAM',
    283: 'CRU',
    284: 'GRE',
    285: 'INT',
    287: 'VIT',
    293: 'CAP',
    294: 'CFC',
    315: 'CHA',
    364: 'REM'
};

window.CLUBES = CLUBES;

const SCOUTS_MAP = {
    GOL: ['G'],
    ASSISTENCIA: ['A'],
    FINALIZACAO: ['FF', 'FD', 'FT'],
    DESARMES: ['DS'],
    SG: ['SG'],
    DEFESAS: ['DE'],
    FALTAS: ['FC'],
    PONTUACAO: ['pontuacao']
};

/* ============================================================
   RENDER PRINCIPAL
   ============================================================ */

window.renderAnaliseCartola = async function () {

    const main = document.getElementById('main-content');

    if (!main) return;

    main.innerHTML = `

        <div class="max-w-[1800px] mx-auto space-y-5">

            <!-- HEADER -->
            <div class="bg-white rounded-[28px] border border-slate-100 shadow-sm p-4 md:p-8">

                <div class="flex items-center gap-4 mb-8">

                    <div class="w-16 h-16 md:w-20 md:h-20 rounded-[24px] bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 shrink-0">

                        <svg xmlns="http://www.w3.org/2000/svg"
                             width="36"
                             height="36"
                             viewBox="0 0 24 24"
                             fill="none"
                             stroke="currentColor"
                             stroke-width="2.4"
                             stroke-linecap="round"
                             stroke-linejoin="round">

                            <path d="M3 3v18h18"/>
                            <path d="M7 14l3-3 3 2 4-5"/>
                            <circle cx="7" cy="14" r="1" fill="currentColor"/>
                            <circle cx="10" cy="11" r="1" fill="currentColor"/>
                            <circle cx="13" cy="13" r="1" fill="currentColor"/>
                            <circle cx="17" cy="8" r="1" fill="currentColor"/>

                        </svg>

                    </div>

                    <div>

                        <h1 class="font-jersey text-4xl md:text-5xl text-slate-800 leading-none">
                            ANÁLISE
                        </h1>

                        <p class="font-jogos text-[9px] md:text-xs tracking-[0.35em] text-slate-400 uppercase mt-2">
                            SCOUTS CEDIDOS / CONQUISTADOS
                        </p>

                    </div>

                </div>

                <!-- CONTROLES -->
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">

                    <!-- SCOUT -->
                    <div>

                        <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">
                            Scout
                        </label>

                        <select id="select-scout"
                                onchange="window.handleScoutChange(this.value)"
                                class="w-full h-12 md:h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 md:px-5 font-black text-sm md:text-base text-slate-700 outline-none focus:border-orange-400">

                            <option value="GOL">GOL</option>
                            <option value="ASSISTENCIA">ASSISTÊNCIA</option>
                            <option value="FINALIZACAO">FINALIZAÇÃO</option>
                            <option value="DESARMES">DESARMES</option>
                            <option value="SG">SG</option>
                            <option value="DEFESAS">DEFESAS</option>
                            <option value="FALTAS">FALTAS</option>
                            <option value="PONTUACAO">PONTUAÇÃO</option>

                        </select>

                    </div>

                    <!-- POSIÇÃO -->
                    <div>

                        <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">
                            Posição
                        </label>

                        <select id="select-posicao"
                                onchange="window.handlePosicaoChange(this.value)"
                                class="w-full h-12 md:h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 md:px-5 font-black text-sm md:text-base text-slate-700 outline-none focus:border-orange-400">

                            <option value="GERAL">GERAL</option>
                            <option value="GOL">GOL</option>
                            <option value="ZAG">ZAG</option>
                            <option value="LAT">LAT</option>
                            <option value="MEI">MEI</option>
                            <option value="ATA">ATA</option>

                        </select>

                    </div>

                    <!-- RODADAS -->
                    <div class="space-y-4">

                        <div class="flex items-center justify-between">

                            <label class="text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase">
                                Últimas Rodadas
                            </label>

                            <span id="range-value"
                                  class="text-sm font-black text-orange-600">
                                5
                            </span>

                        </div>

                        <input type="range"
                               id="range-rodadas"
                               min="1"
                               max="5"
                               value="5"
                               onchange="window.handleRangeChange(this.value)"
                               class="w-full accent-orange-500 cursor-pointer">

                    </div>

                    <!-- MODO -->
                    <div>

                        <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">
                            Análise
                        </label>

                        <div class="flex gap-3">

                            <button onclick="window.handleModoAnalise('MANDANTE')"
                                    id="btn-mandante"
                                    class="flex-1 h-12 md:h-14 rounded-2xl bg-orange-500 text-white font-black text-xs md:text-sm transition-all">
                                MANDANTE
                            </button>

                            <button onclick="window.handleModoAnalise('VISITANTE')"
                                    id="btn-visitante"
                                    class="flex-1 h-12 md:h-14 rounded-2xl bg-slate-100 text-slate-400 font-black text-xs md:text-sm transition-all">
                                VISITANTE
                            </button>

                        </div>

                    </div>

                </div>

            </div>

            <!-- TABELA -->
            <div id="analise-tabela"></div>

        </div>

    `;

    await carregarAnaliseCedidos();
};

/* ============================================================
   CARREGAR DADOS
   ============================================================ */

async function carregarAnaliseCedidos() {

    try {

        const statusRes = await fetch(`${ANALISE_PROXY}/mercado/status`);
        const statusData = await statusRes.json();

        analiseState.rodadaAtual = statusData.rodada_atual;

        const rodadaAnalise = analiseState.rodadaAtual - 1;

        analiseState.ultimasRodadas = Math.min(5, rodadaAnalise);

        const range = document.getElementById('range-rodadas');
        const rangeValue = document.getElementById('range-value');

        if (range) {
            range.max = rodadaAnalise;
            range.value = analiseState.ultimasRodadas;
        }

        if (rangeValue) {
            rangeValue.innerText = analiseState.ultimasRodadas;
        }

        const partidasRes = await fetch(`${ANALISE_PROXY}/partidas/${analiseState.rodadaAtual}`);
        const partidasData = await partidasRes.json();

        analiseState.partidas = partidasData.partidas || [];

        renderTabelaCedidos();

    } catch (err) {

        console.error(err);

    }
}

/* ============================================================
   EVENTOS
   ============================================================ */

window.handleScoutChange = function(valor) {

    analiseState.scoutSelecionado = valor;

    renderTabelaCedidos();
};

window.handlePosicaoChange = function(valor) {

    analiseState.posicaoSelecionada = valor;

    renderTabelaCedidos();
};

window.handleRangeChange = function(valor) {

    analiseState.ultimasRodadas = parseInt(valor);

    const rangeValue = document.getElementById('range-value');

    if (rangeValue) {
        rangeValue.innerText = valor;
    }

    renderTabelaCedidos();
};

window.handleModoAnalise = function(modo) {

    analiseState.modoAnalise = modo;

    const btnMandante = document.getElementById('btn-mandante');
    const btnVisitante = document.getElementById('btn-visitante');

    if (modo === 'MANDANTE') {

        btnMandante.className =
            'flex-1 h-12 md:h-14 rounded-2xl bg-orange-500 text-white font-black text-xs md:text-sm transition-all';

        btnVisitante.className =
            'flex-1 h-12 md:h-14 rounded-2xl bg-slate-100 text-slate-400 font-black text-xs md:text-sm transition-all';

    } else {

        btnVisitante.className =
            'flex-1 h-12 md:h-14 rounded-2xl bg-orange-500 text-white font-black text-xs md:text-sm transition-all';

        btnMandante.className =
            'flex-1 h-12 md:h-14 rounded-2xl bg-slate-100 text-slate-400 font-black text-xs md:text-sm transition-all';
    }

    renderTabelaCedidos();
};

window.sortTabelaAnalise = function(coluna) {

    if (analiseState.sortColumn === coluna) {

        analiseState.sortDirection =
            analiseState.sortDirection === 'asc'
                ? 'desc'
                : 'asc';

    } else {

        analiseState.sortColumn = coluna;
        analiseState.sortDirection = 'desc';
    }

    renderTabelaCedidos();
};

/* ============================================================
   HELPERS
   ============================================================ */

function getShield(teamId) {
    return `images/escudos_brasileirao/${teamId}.png`;
}

function getTeamName(teamId) {
    return CLUBES[teamId] || 'TIME';
}

function getSortIcon(coluna) {

    if (analiseState.sortColumn !== coluna) {

        return `
            <svg xmlns="http://www.w3.org/2000/svg"
                 width="10"
                 height="10"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 class="opacity-40">

                <path d="m7 15 5 5 5-5"/>
                <path d="m7 9 5-5 5 5"/>

            </svg>
        `;
    }

    if (analiseState.sortDirection === 'asc') {

        return `
            <svg xmlns="http://www.w3.org/2000/svg"
                 width="10"
                 height="10"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2.4"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 class="text-orange-500">

                <path d="m7 15 5 5 5-5"/>

            </svg>
        `;
    }

    return `
        <svg xmlns="http://www.w3.org/2000/svg"
             width="10"
             height="10"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2.4"
             stroke-linecap="round"
             stroke-linejoin="round"
             class="text-orange-500">

            <path d="m7 9 5-5 5 5"/>

        </svg>
    `;
}

/* ============================================================
   CONQUISTADO
   ============================================================ */

function obterScoutConquistado(clubeId, scout, posicao, ultimasRodadas, mando) {

    if (!window.dadosCartola || !window.dadosCartola.times) {

        return {
            total: 0,
            media: 0
        };
    }

    const scoutsAlvo = SCOUTS_MAP[scout] || [];

    let total = 0;

    const partidas = window.dadosCartola.times[getTeamName(clubeId)];

    if (!partidas) {

        return {
            total: 0,
            media: 0
        };
    }

    const partidasValidas = partidas
        .filter(p => p.rodada < analiseState.rodadaAtual)
        .filter(p => p.mando === mando)
        .sort((a, b) => b.rodada - a.rodada)
        .slice(0, ultimasRodadas);

    partidasValidas.forEach(partida => {

        if (scout === 'SG') {

            const teveSG = partida.atletas.some(a => Number(a.SG) > 0);

            if (teveSG) total += 1;

            return;
        }

        partida.atletas.forEach(atleta => {

            if (
                posicao !== 'GERAL' &&
                atleta.pos !== posicao
            ) return;

            scoutsAlvo.forEach(sc => {

                total += Number(atleta[sc] || 0);

            });

        });

    });

    return {
        total: Number(total.toFixed(2)),
        media: partidasValidas.length
            ? Number((total / partidasValidas.length).toFixed(2))
            : 0
    };
}

/* ============================================================
   CEDIDOS — CORRIGIDO
   ============================================================ */

function obterScoutCedidos(clubeId, scout, posicao, ultimasRodadas, tipoMando) {

    if (!window.dadosCartola || !window.dadosCartola.times) {

        return {
            total: 0,
            media: 0
        };
    }

    const scoutsAlvo = SCOUTS_MAP[scout] || [];

    const siglaTime = getTeamName(clubeId);

    const partidasTime = window.dadosCartola.times[siglaTime];

    if (!partidasTime) {

        return {
            total: 0,
            media: 0
        };
    }

    const partidasValidas = partidasTime
        .filter(p => p.rodada < analiseState.rodadaAtual)
        .filter(p => p.mando === tipoMando)
        .sort((a, b) => b.rodada - a.rodada)
        .slice(0, ultimasRodadas);

    let total = 0;

    partidasValidas.forEach(partida => {

        const siglaAdv = partida.adv;

        const partidasAdv = window.dadosCartola.times[siglaAdv];

        if (!partidasAdv) return;

        const partidaAdv = partidasAdv.find(p => {

            return (
                p.rodada === partida.rodada &&
                p.id_adv === clubeId
            );

        });

        if (!partidaAdv) return;

        if (scout === 'SG') {

            const teveSG = partidaAdv.atletas.some(a => Number(a.SG) > 0);

            if (teveSG) total += 1;

            return;
        }

        partidaAdv.atletas.forEach(atleta => {

            if (
                posicao !== 'GERAL' &&
                atleta.pos !== posicao
            ) return;

            scoutsAlvo.forEach(sc => {

                total += Number(atleta[sc] || 0);

            });

        });

    });

    return {
        total: Number(total.toFixed(2)),
        media: partidasValidas.length
            ? Number((total / partidasValidas.length).toFixed(2))
            : 0
    };
}

/* ============================================================
   RENDER TABELA
   ============================================================ */

function renderTabelaCedidos() {

    const container = document.getElementById('analise-tabela');

    if (!container) return;

    let linhas = [];

    analiseState.partidas.forEach(match => {

        let valorCasa = {
            total: 0,
            media: 0
        };

        let valorFora = {
            total: 0,
            media: 0
        };

        if (analiseState.modoAnalise === 'MANDANTE') {

            valorCasa = obterScoutConquistado(
                match.clube_casa_id,
                analiseState.scoutSelecionado,
                analiseState.posicaoSelecionada,
                analiseState.ultimasRodadas,
                'CASA'
            );

            valorFora = obterScoutCedidos(
                match.clube_visitante_id,
                analiseState.scoutSelecionado,
                analiseState.posicaoSelecionada,
                analiseState.ultimasRodadas,
                'FORA'
            );

        } else {

            valorCasa = obterScoutCedidos(
                match.clube_casa_id,
                analiseState.scoutSelecionado,
                analiseState.posicaoSelecionada,
                analiseState.ultimasRodadas,
                'CASA'
            );

            valorFora = obterScoutConquistado(
                match.clube_visitante_id,
                analiseState.scoutSelecionado,
                analiseState.posicaoSelecionada,
                analiseState.ultimasRodadas,
                'FORA'
            );
        }

        linhas.push({

            casaId: match.clube_casa_id,
            foraId: match.clube_visitante_id,

            casa: getTeamName(match.clube_casa_id),
            fora: getTeamName(match.clube_visitante_id),

            valorCasa,
            valorFora
        });

    });

    /* ============================================================
       SORT
       ============================================================ */

    if (analiseState.sortColumn) {

        linhas.sort((a, b) => {

            const dir =
                analiseState.sortDirection === 'asc'
                    ? 1
                    : -1;

            const valorA =
                typeof a[analiseState.sortColumn] === 'object'
                    ? a[analiseState.sortColumn].total
                    : a[analiseState.sortColumn];

            const valorB =
                typeof b[analiseState.sortColumn] === 'object'
                    ? b[analiseState.sortColumn].total
                    : b[analiseState.sortColumn];

            if (valorA < valorB) {
                return -1 * dir;
            }

            if (valorA > valorB) {
                return 1 * dir;
            }

            return 0;
        });
    }

    /* ============================================================
       RENDER
       ============================================================ */

    container.innerHTML = `

        <div class="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">

            <!-- HEADER -->
            <div class="grid grid-cols-[1fr_72px_26px_72px_1fr]
                        md:grid-cols-[1fr_110px_40px_110px_1fr]
                        gap-1 md:gap-2
                        px-2 md:px-6
                        py-3 md:py-4
                        bg-slate-50
                        border-b border-slate-100">

                <!-- CASA -->
                <div class="flex items-center justify-center">

                    <span class="text-[8px] md:text-xs font-jogos tracking-[0.18em] text-slate-400 uppercase">
                        CASA
                    </span>

                </div>

                <!-- VALOR CASA -->
                <div class="flex flex-col items-center justify-center">

                    <button onclick="window.sortTabelaAnalise('valorCasa')"
                            class="inline-flex items-center gap-1 text-[8px] md:text-xs font-jogos tracking-[0.08em] text-slate-400 uppercase hover:text-orange-500 transition-all">

                        ${analiseState.modoAnalise === 'MANDANTE'
                            ? 'CONQ'
                            : 'CED'}

                        ${getSortIcon('valorCasa')}

                    </button>

                    <span class="text-[6px] md:text-[9px] font-jogos tracking-[0.08em] text-slate-300 uppercase mt-[2px]">
                        TOTAL/MED
                    </span>

                </div>

                <!-- X -->
                <div></div>

                <!-- VALOR FORA -->
                <div class="flex flex-col items-center justify-center">

                    <button onclick="window.sortTabelaAnalise('valorFora')"
                            class="inline-flex items-center gap-1 text-[8px] md:text-xs font-jogos tracking-[0.08em] text-slate-400 uppercase hover:text-orange-500 transition-all">

                        ${analiseState.modoAnalise === 'MANDANTE'
                            ? 'CED'
                            : 'CONQ'}

                        ${getSortIcon('valorFora')}

                    </button>

                    <span class="text-[6px] md:text-[9px] font-jogos tracking-[0.08em] text-slate-300 uppercase mt-[2px]">
                        TOTAL/MED
                    </span>

                </div>

                <!-- FORA -->
                <div class="flex items-center justify-center">

                    <span class="text-[8px] md:text-xs font-jogos tracking-[0.18em] text-slate-400 uppercase">
                        FORA
                    </span>

                </div>

            </div>

            <!-- BODY -->
            <div>

                ${linhas.map(item => `

                    <div class="grid grid-cols-[1fr_72px_26px_72px_1fr]
                                md:grid-cols-[1fr_110px_40px_110px_1fr]
                                gap-1 md:gap-2
                                px-2 md:px-6
                                py-3 md:py-4
                                border-b border-slate-50
                                hover:bg-orange-50/40
                                transition-all
                                items-center">

                        <!-- CASA -->
                        <div class="flex flex-col items-center justify-center min-w-0">

                            <img src="${getShield(item.casaId)}"
                                 class="w-12 h-12 md:w-16 md:h-16 object-contain shrink-0">

                            <span class="font-black text-slate-800 text-[9px] md:text-sm mt-1 truncate">

                                ${item.casa}

                            </span>

                        </div>

                        <!-- VALOR CASA -->
                        <div class="flex flex-col items-center justify-center">

                            <span class="${analiseState.modoAnalise === 'MANDANTE'
                                ? 'text-green-700'
                                : 'text-orange-700'}
                                font-black text-xl md:text-3xl leading-none">

                                ${item.valorCasa.total.toFixed(2)}

                            </span>

                            <span class="${analiseState.modoAnalise === 'MANDANTE'
                                ? 'text-green-500'
                                : 'text-orange-500'}
                                text-[9px] md:text-xs font-bold mt-1 leading-none">

                                ${item.valorCasa.media.toFixed(2)}

                            </span>

                        </div>

                        <!-- X -->
                        <div class="flex justify-center">

                            <span class="font-jogos text-slate-300 text-sm md:text-xl">
                                X
                            </span>

                        </div>

                        <!-- VALOR FORA -->
                        <div class="flex flex-col items-center justify-center">

                            <span class="${analiseState.modoAnalise === 'MANDANTE'
                                ? 'text-orange-700'
                                : 'text-green-700'}
                                font-black text-xl md:text-3xl leading-none">

                                ${item.valorFora.total.toFixed(2)}

                            </span>

                            <span class="${analiseState.modoAnalise === 'MANDANTE'
                                ? 'text-orange-500'
                                : 'text-green-500'}
                                text-[9px] md:text-xs font-bold mt-1 leading-none">

                                ${item.valorFora.media.toFixed(2)}

                            </span>

                        </div>

                        <!-- FORA -->
                        <div class="flex flex-col items-center justify-center min-w-0">

                            <img src="${getShield(item.foraId)}"
                                 class="w-12 h-12 md:w-16 md:h-16 object-contain shrink-0">

                            <span class="font-black text-slate-800 text-[9px] md:text-sm mt-1 truncate">

                                ${item.fora}

                            </span>

                        </div>

                    </div>

                `).join('')}

            </div>

        </div>

    `;
}

/* ============================================================
   IRP — ÍNDICE DE POTENCIAL DE VALORIZAÇÃO
   APAGAR EM CASO DE ERRO DESTE TRECHO PARA BAIXO
   ============================================================ */
 
const IRP_PROXY = 'https://proxy-f5nr.onrender.com';
 
window.irpState = {
    mercadoAPI: {},        // Map atleta_id -> dados mercado (preço, mpv, status, foto, etc)
    rodadasAnteriores: {}, // Map atleta_id -> { pm (mpv), pc0 (cedido) }
    cacheProcessado: [],
    sortColumn: 'irp',
    sortDirection: 'desc',
    filtros: {
        mando: 'GERAL',
        status: ['7', '2', '6'],
        posicoes: ['GOL', 'LAT', 'ZAG', 'MEI', 'ATA', 'TEC'],
        clubes: [],
        busca: '',
        minJogos: 1
    },
    carregado: false,
    carregando: false
};
 
// Apenas PROVÁVEL (7), DÚVIDA (2) e NULO (6) são relevantes para análise
const IRP_STATUS_MAP = {
    7: { texto: "PROVÁVEL", cor: "#10b981" },   // emerald-500
    2: { texto: "DÚVIDA",   cor: "#f59e0b" },   // amber-500
    6: { texto: "NULO",     cor: "#ef4444" }    // red-500
};
 
/* ============================================================
   BUSCA DE DADOS (mesma fonte do modal de prováveis)
   ============================================================ */
 
async function carregarDadosIRP() {
 
    if (window.irpState.carregado || window.irpState.carregando) return;
 
    window.irpState.carregando = true;
 
    try {
 
        const [mercadoRes, rodadasRes] = await Promise.all([
            fetch(`${IRP_PROXY}/mercado`),
            fetch(`${IRP_PROXY}/escalar/rodadas-anteriores`)
        ]);
 
        if (mercadoRes.ok) {
            const data = await mercadoRes.json();
            (data.atletas || []).forEach(a => {
                window.irpState.mercadoAPI[a.atleta_id] = a;
            });
        }
 
        if (rodadasRes.ok) {
            window.irpState.rodadasAnteriores = await rodadasRes.json();
        }
 
        window.irpState.carregado = true;
 
    } catch (err) {
        console.error("❌ Erro ao carregar dados IRP:", err);
    } finally {
        window.irpState.carregando = false;
    }
}
 
/* ============================================================
   PROCESSAMENTO – aplica a fórmula IRP
   ============================================================ */
 
function processarIRP() {
 
    if (!window.dadosCartola || !window.dadosCartola.times) return;
 
    const filtros = window.irpState.filtros;
    const mapa = {};
 
    // Agrega histórico do atleta a partir de dadosCartola.times
    Object.entries(window.dadosCartola.times).forEach(([sigla, partidas]) => {
 
        if (filtros.clubes.length && !filtros.clubes.includes(sigla)) return;
 
        partidas.forEach(partida => {
 
            const mandoRodada = partida.mando;
 
            partida.atletas.forEach(atleta => {
 
                const id = String(atleta.id_atleta);
 
                if (filtros.posicoes.length && !filtros.posicoes.includes(atleta.pos)) return;
 
                const jogou = (
                    atleta.pontuacao !== 0 ||
                    atleta.G > 0 || atleta.A > 0 ||
                    atleta.DS > 0 || atleta.DE > 0 ||
                    atleta.FC > 0 || atleta.FS > 0 ||
                    atleta.CA > 0 || atleta.CV > 0 ||
                    atleta.GS > 0
                );
 
                if (!jogou) return;
 
                if (!mapa[id]) {
                    mapa[id] = {
                        id,
                        nome: atleta.atleta,
                        pos: atleta.pos,
                        clube: sigla,
                        somaGeral: 0, jogosGeral: 0,
                        somaCasa: 0, jogosCasa: 0,
                        somaFora: 0, jogosFora: 0,
                        pontuacoes: [] // [{rodada, pontuacao}] para desvio padrão e fase
                    };
                }
 
                mapa[id].somaGeral += atleta.pontuacao;
                mapa[id].jogosGeral++;
                mapa[id].pontuacoes.push({ rodada: partida.rodada, pontuacao: atleta.pontuacao });
 
                if (mandoRodada === "CASA") {
                    mapa[id].somaCasa += atleta.pontuacao;
                    mapa[id].jogosCasa++;
                } else if (mandoRodada === "FORA") {
                    mapa[id].somaFora += atleta.pontuacao;
                    mapa[id].jogosFora++;
                }
            });
        });
    });
 
    const resultado = [];
 
    Object.values(mapa).forEach(hist => {
 
        const apiAtleta = window.irpState.mercadoAPI[hist.id];
        const rodadaAtleta = window.irpState.rodadasAnteriores[hist.id];
 
        // Preço vem do /mercado
        const preco = apiAtleta ? Number(apiAtleta.preco_num || 0) : 0;
 
        // MPV vem do /escalar/rodadas-anteriores (campo pm) – mesma fonte do modal
        // MPV negativo ou zero = valoriza com qualquer pontuação → tratamos como 0.01 para a fórmula
        const mpvRaw = rodadaAtleta && rodadaAtleta.pm !== undefined
            ? Number(rodadaAtleta.pm)
            : (apiAtleta ? Number(apiAtleta.minimo_para_valorizar || 0) : 0);
        const mpv = mpvRaw <= 0 ? 0.01 : mpvRaw;
 
        const jogosTotais = apiAtleta ? Number(apiAtleta.jogos_num || 0) : 0;
        const statusId = apiAtleta ? String(apiAtleta.status_id) : "6";
        const foto = apiAtleta ? apiAtleta.foto : null;
 
        // Filtros
        // Apenas PROVÁVEL (7), DÚVIDA (2) e NULO (6) entram na análise
        if (!['7', '2', '6'].includes(statusId)) return;
        if (!filtros.status.includes(statusId)) return;
        if (jogosTotais < filtros.minJogos) return;
        if (preco <= 0) return;
 
        // Média por mando
        let media = 0, totJogosMando = 0;
 
        if (filtros.mando === "MANDO_RODADA") {
            // Detecta o mando do clube do atleta na rodada atual
            const partidas = analiseState.partidas || [];
            let mandoRodada = null;
            for (const p of partidas) {
                const casaSigla = getTeamName(p.clube_casa_id);
                const foraSigla = getTeamName(p.clube_visitante_id);
                if (casaSigla === hist.clube) { mandoRodada = "CASA"; break; }
                if (foraSigla === hist.clube) { mandoRodada = "FORA"; break; }
            }
            if (mandoRodada === "CASA") {
                totJogosMando = hist.jogosCasa;
                media = totJogosMando ? hist.somaCasa / totJogosMando : 0;
            } else if (mandoRodada === "FORA") {
                totJogosMando = hist.jogosFora;
                media = totJogosMando ? hist.somaFora / totJogosMando : 0;
            } else {
                // Clube sem jogo na rodada: usa geral como fallback
                totJogosMando = hist.jogosGeral;
                media = totJogosMando ? hist.somaGeral / totJogosMando : 0;
            }
        } else if (filtros.mando === "CASA") {
            totJogosMando = hist.jogosCasa;
            media = totJogosMando ? hist.somaCasa / totJogosMando : 0;
        } else if (filtros.mando === "FORA") {
            totJogosMando = hist.jogosFora;
            media = totJogosMando ? hist.somaFora / totJogosMando : 0;
        } else {
            totJogosMando = hist.jogosGeral;
            media = totJogosMando ? hist.somaGeral / totJogosMando : 0;
        }
 
        if (totJogosMando <= 0 || media <= 0) return;

        // ── CRITÉRIO 1: Eficiência (media / mpv) ─────────────────────────
        const eficiencia = media / mpv;

        // ── CRITÉRIO 2: Margem absoluta (media - mpv) ────────────────────
        const margem = Math.max(0, media - mpv);

        // ── CRITÉRIO 3: Consistência via desvio padrão ───────────────────
        const ponts = (hist.pontuacoes || []).map(p => p.pontuacao);
        let consistencia = 1;
        if (ponts.length >= 2) {
            const mediaGeralCalc = hist.somaGeral / hist.jogosGeral;
            const variancia = ponts.reduce((acc, p) => acc + Math.pow(p - mediaGeralCalc, 2), 0) / ponts.length;
            const desvio = Math.sqrt(variancia);
            consistencia = 1 / (1 + desvio);
        }

        // ── CRITÉRIO 4: Penalização suave por MPV alto (acima de 3) ──────
        // MPV 3 → 1.0 | MPV 5 → 0.625 | MPV 8 → 0.4
        const fatorMPV = 1 / (1 + Math.max(0, mpv - 3) * 0.3);

        // ── CRITÉRIO 5: Confiança amostral (satura em 10 jogos) ──────────
        const confianca = Math.min(totJogosMando, 10) / 10;

        // ── CRITÉRIO 6: Fase (média últimos 3 jogos vs média geral) ──────
        // Independente de mando | neutro (1.0) se menos de 3 jogos
        let fatorFase = 1.0;
        if (hist.pontuacoes && hist.pontuacoes.length >= 3) {
            const ultimas3 = hist.pontuacoes
                .slice()
                .sort((a, b) => b.rodada - a.rodada)
                .slice(0, 3);
            const mediaFase = ultimas3.reduce((s, p) => s + p.pontuacao, 0) / 3;
            const mediaGeralAtleta = hist.somaGeral / hist.jogosGeral;
            // Limita entre 0.5 (má fase) e 1.5 (boa fase)
            fatorFase = Math.min(1.5, Math.max(0.5, mediaFase / mediaGeralAtleta));
        }

        // ── COMPOSIÇÃO FINAL ─────────────────────────────────────────────
        const irp = eficiencia * margem * consistencia * fatorMPV * confianca * fatorFase;

        resultado.push({
            id: hist.id,
            nome: hist.nome,
            foto,
            statusId,
            pos: hist.pos,
            clube: hist.clube,
            jogos: totJogosMando,
            media,
            mpv,
            razao: eficiencia,
            preco,
            fatorFase,
            irp
        });
    });

    window.irpState.cacheProcessado = resultado;

    // Normalização: raiz quadrada + escala 0-10
    // Reduz disparidade visual sem alterar o ranking
    if (resultado.length) {
        const sqrts = resultado.map(r => Math.sqrt(Math.max(0, r.irp)));
        const maxSqrt = Math.max(...sqrts);
        if (maxSqrt > 0) {
            resultado.forEach((r, i) => {
                r.irp = (sqrts[i] / maxSqrt) * 10;
            });
        }
    }
 
    aplicarOrdenacaoIRP();
}
 
/* ============================================================
   ORDENAÇÃO E RENDER
   ============================================================ */
 
window.sortIRP = function(coluna) {
 
    if (window.irpState.sortColumn === coluna) {
        window.irpState.sortDirection =
            window.irpState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        window.irpState.sortColumn = coluna;
        window.irpState.sortDirection =
            ['nome', 'pos', 'clube', 'status'].includes(coluna) ? 'asc' : 'desc';
    }
 
    aplicarOrdenacaoIRP();
};
 
function aplicarOrdenacaoIRP() {
 
    const col = window.irpState.sortColumn;
    const dir = window.irpState.sortDirection === 'asc' ? 1 : -1;
 
    window.irpState.cacheProcessado.sort((a, b) => {
 
        let va = col === 'status' ? parseInt(a.statusId) : a[col];
        let vb = col === 'status' ? parseInt(b.statusId) : b[col];
 
        if (typeof va === 'string') {
            return dir * va.localeCompare(vb);
        }
        return dir * ((va || 0) - (vb || 0));
    });
 
    renderTabelaIRP();
}
 
function getSortIconIRP(coluna) {
 
    if (window.irpState.sortColumn !== coluna) {
        return `<span class="opacity-30 text-[8px]">↕</span>`;
    }
 
    return window.irpState.sortDirection === 'asc'
        ? `<span class="text-orange-500 text-[10px]">▲</span>`
        : `<span class="text-orange-500 text-[10px]">▼</span>`;
}
 
function abreviarNome(nome) {
    if (!nome) return '';
    const partes = nome.trim().split(/\s+/);
    if (partes.length <= 1) return partes[0];
    // Abrevia todos os nomes exceto o último
    return partes.slice(0, -1).map(p => p[0].toUpperCase() + '.').join(' ') + ' ' + partes[partes.length - 1];
}
 
function renderTabelaIRP() {
 
    const tbody = document.getElementById('irp-tbody');
    if (!tbody) return;
 
    const busca = window.irpState.filtros.busca.toUpperCase();
    const lista = busca
        ? window.irpState.cacheProcessado.filter(a => a.nome.toUpperCase().includes(busca))
        : window.irpState.cacheProcessado;
 
    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-slate-400 font-jogos text-xs uppercase tracking-widest">
                    Nenhum atleta encontrado
                </td>
            </tr>
        `;
        return;
    }
 
    tbody.innerHTML = lista.map((a) => {
 
        const st = IRP_STATUS_MAP[a.statusId];
        const corStatus = st ? st.cor : '#94a3b8';
 
        const nomeAbrev = abreviarNome(a.nome);
 
        return `
            <tr class="border-b border-slate-50 hover:bg-orange-50/40 transition-all">
 
                <!-- NOME: bolinha de status colada ao nome + foto -->
                <td class="px-3 py-2">
                    <div class="flex items-center gap-1.5">
                        ${a.foto ? `
                            <img src="${a.foto.replace('FORMATO', '140x140')}"
                                 class="w-7 h-7 rounded-full bg-slate-100 object-cover shrink-0"
                                 onerror="this.style.display='none'">
                        ` : `<div class="w-7 h-7 rounded-full bg-slate-100 shrink-0"></div>`}
                        <span title="${st ? st.texto : ''}"
                              style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${corStatus};flex-shrink:0;"></span>
                        <span class="text-xs font-black text-slate-800 truncate" style="max-width:110px;">${nomeAbrev}</span>
                    </div>
                </td>
 
                <!-- POSIÇÃO — coluna próxima do nome -->
                <td class="px-1 py-2">
                    <span class="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-black text-slate-600">${a.pos}</span>
                </td>
 
                <!-- JOGOS -->
                <td class="px-2 py-2 text-center text-xs font-bold text-slate-600">${a.jogos}</td>
 
                <!-- MÉDIA -->
                <td class="px-2 py-2 text-center text-xs font-black text-sky-600">${a.media.toFixed(2)}</td>
 
                <!-- MPV — 1 casa decimal, sem arredondar -->
                <td class="px-2 py-2 text-center text-xs font-bold text-slate-600">${Math.trunc(a.mpv * 10) / 10}</td>
 
                <!-- PREÇO -->
                <td class="px-2 py-2 text-center text-xs font-bold text-slate-700">C$ ${a.preco.toFixed(2)}</td>
 
                <!-- IRP -->
                <td class="px-2 py-2 text-center text-sm font-black text-orange-600">${a.irp.toFixed(2)}</td>
 
            </tr>
        `;
    }).join('');
}
 
/* ============================================================
   HANDLERS DE FILTRO
   ============================================================ */
 
window.handleIRPMando = function(valor) {
    window.irpState.filtros.mando = valor;
 
    document.querySelectorAll('.irp-mando-btn').forEach(btn => {
        if (btn.dataset.valor === valor) {
            btn.className = 'irp-mando-btn flex-1 h-10 rounded-xl bg-orange-500 text-white font-black text-xs transition-all';
        } else {
            btn.className = 'irp-mando-btn flex-1 h-10 rounded-xl bg-slate-100 text-slate-400 font-black text-xs transition-all';
        }
        btn.dataset.valor = btn.dataset.valor; // mantém
    });
 
    processarIRP();
};
 
window.handleIRPCheckbox = function(grupo, valor, checked) {
 
    const arr = window.irpState.filtros[grupo];
 
    if (checked) {
        if (!arr.includes(valor)) arr.push(valor);
    } else {
        const idx = arr.indexOf(valor);
        if (idx > -1) arr.splice(idx, 1);
    }
 
    processarIRP();
};
 
window.handleIRPBusca = function(valor) {
    window.irpState.filtros.busca = valor;
    processarIRP();
};
 
window.handleIRPMinJogos = function(valor) {
    window.irpState.filtros.minJogos = parseInt(valor) || 0;
    processarIRP();
};
 
window.handleIRPPosicoesTodos = function(marcar) {
    document.querySelectorAll('.irp-pos-cb').forEach(cb => { cb.checked = marcar; });
    window.irpState.filtros.posicoes = marcar ? ['GOL', 'LAT', 'ZAG', 'MEI', 'ATA', 'TEC'] : [];
    processarIRP();
};
 
window.toggleIRPClube = function(btn) {
    const sigla = btn.dataset.clube;
    const ativo = btn.dataset.ativo === 'true';
    const novoAtivo = !ativo;
 
    btn.dataset.ativo = novoAtivo;
    btn.style.borderColor = novoAtivo ? '#f97316' : 'transparent';
 
    const arr = window.irpState.filtros.clubes;
    if (novoAtivo) {
        if (!arr.includes(sigla)) arr.push(sigla);
    } else {
        const idx = arr.indexOf(sigla);
        if (idx > -1) arr.splice(idx, 1);
    }
 
    processarIRP();
};
 
window.handleIRPClubesTodos = function(marcar) {
    document.querySelectorAll('.irp-clube-btn').forEach(btn => {
        btn.dataset.ativo = marcar ? 'true' : 'false';
        btn.style.borderColor = marcar ? '#f97316' : 'transparent';
    });
 
    if (marcar) {
        window.irpState.filtros.clubes = Object.values(window.CLUBES || {});
    } else {
        window.irpState.filtros.clubes = [];
    }
 
    processarIRP();
};
 
/* ============================================================
   RENDER DO PAINEL IRP
   ============================================================ */
 
window.renderPainelIRP = async function() {
 
    const container = document.getElementById('analise-tabela');
    if (!container) return;
 
    // Remove painel antigo se existir (garante que sempre renderiza a versão atual)
    const painelAntigo = document.getElementById('irp-panel');
    if (painelAntigo) painelAntigo.remove();
 
    // Estado inicial dos clubes (todos selecionados)
    if (window.CLUBES && !window.irpState.filtros.clubes.length) {
        window.irpState.filtros.clubes = Object.values(window.CLUBES);
    }
 
    const painelHtml = `
        <div id="irp-panel" class="bg-white rounded-[28px] border border-slate-100 shadow-sm p-4 md:p-8 mt-6">
 
            <!-- HEADER -->
            <div class="flex items-center gap-4 mb-6">
                <div class="w-14 h-14 md:w-16 md:h-16 rounded-[20px] bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                </div>
                <h2 class="font-jersey leading-none" style="font-size:clamp(1.1rem,4vw,2rem);white-space:nowrap;color:#1e293b;">
                    ÍNDICE DE POTENCIAL DE VALORIZAÇÃO
                </h2>
            </div>
 
            <!-- FILTROS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
 
                <!-- MANDO -->
                <div>
                    <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">Mando</label>
                    <div class="flex gap-2">
                        <button onclick="window.handleIRPMando('GERAL')" data-valor="GERAL"
                                class="irp-mando-btn flex-1 h-10 rounded-xl bg-orange-500 text-white font-black text-xs transition-all">GERAL</button>
                        <button onclick="window.handleIRPMando('MANDO_RODADA')" data-valor="MANDO_RODADA"
                                class="irp-mando-btn flex-1 h-10 rounded-xl bg-slate-100 text-slate-400 font-black text-xs transition-all">CASA / FORA</button>
                    </div>
                </div>
 
                <!-- STATUS — apenas PROVÁVEL, DÚVIDA e NULO -->
                <div>
                    <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">Status</label>
                    <div class="flex flex-wrap gap-2">
                        ${[
                            { v: '7', l: 'PROVÁVEL', cor: '#10b981', c: true },
                            { v: '2', l: 'DÚVIDA',   cor: '#f59e0b', c: true },
                            { v: '6', l: 'NULO',     cor: '#ef4444', c: true }
                        ].map(s => `
                            <label class="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-orange-50">
                                <input type="checkbox" value="${s.v}" ${s.c ? 'checked' : ''}
                                       onchange="window.handleIRPCheckbox('status', '${s.v}', this.checked)"
                                       class="accent-orange-500">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.cor};"></span>
                                <span class="text-[10px] font-black text-slate-600">${s.l}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
 
                <!-- POSIÇÕES -->
                <div class="md:col-span-2">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase">Posição</label>
                        <div class="flex gap-2">
                            <button onclick="window.handleIRPPosicoesTodos(true)" title="Todas as posições"
                                    class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-orange-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                     fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </button>
                            <button onclick="window.handleIRPPosicoesTodos(false)" title="Limpar posições"
                                    class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                     fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6"/>
                                    <path d="M14 11v6"/>
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${['GOL', 'LAT', 'ZAG', 'MEI', 'ATA', 'TEC'].map(p => `
                            <label class="irp-pos-label flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-orange-50">
                                <input type="checkbox" value="${p}" checked
                                       onchange="window.handleIRPCheckbox('posicoes', '${p}', this.checked)"
                                       class="irp-pos-cb accent-orange-500">
                                <span class="text-[10px] font-black text-slate-600">${p}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
 
            </div>
 
            <!-- CLUBES — escudos em círculo, borda laranja quando selecionado -->
            <div class="mb-5">
                <div class="flex items-center justify-between mb-3">
                    <label class="text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase">Clubes</label>
                    <div class="flex gap-2">
                        <!-- TODOS: ícone check minimalista -->
                        <button onclick="window.handleIRPClubesTodos(true)" title="Todos"
                                class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-orange-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                 fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </button>
                        <!-- LIMPAR: ícone lixeira minimalista -->
                        <button onclick="window.handleIRPClubesTodos(false)" title="Limpar"
                                class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                 fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/>
                                <path d="M14 11v6"/>
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="irp-clubes-grid" class="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    ${Object.entries(window.CLUBES || {}).map(([id, sigla]) => `
                        <button
                            type="button"
                            data-clube="${sigla}"
                            data-ativo="true"
                            onclick="window.toggleIRPClube(this)"
                            class="irp-clube-btn w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-orange-400 transition-all"
                            title="${sigla}">
                            <img src="images/escudos_brasileirao/${id}.png"
                                 class="w-7 h-7 object-contain"
                                 onerror="this.parentElement.innerHTML='<span style=\'font-size:8px;font-weight:900;color:#64748b\'>${sigla}</span>'">
                        </button>
                    `).join('')}
                </div>
            </div>
 
            <!-- MIN JOGOS -->
            <div class="mb-4">
                <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">Mínimo de Jogos</label>
                <input type="number" min="0" value="1"
                       oninput="window.handleIRPMinJogos(this.value)"
                       class="w-32 h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-orange-400">
            </div>
 
            <!-- BUSCAR ATLETA — logo acima da tabela -->
            <div class="mb-3">
                <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">Buscar Atleta</label>
                <input type="text" oninput="window.handleIRPBusca(this.value)"
                       placeholder="Digite o nome..."
                       class="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-400">
            </div>
 
            <!-- TABELA — 10 linhas visíveis, scroll vertical, responsiva -->
            <div class="rounded-2xl border border-slate-100 overflow-hidden">
                <div style="max-height:480px;overflow-y:auto;overflow-x:auto;">
                    <table class="w-full text-left" style="min-width:360px;border-collapse:collapse;">
                        <thead class="bg-slate-50" style="position:sticky;top:0;z-index:10;">
                            <tr>
                                <th onclick="window.sortIRP('nome')" class="px-3 py-3 text-[9px] font-jogos tracking-widest text-slate-500 uppercase cursor-pointer hover:text-orange-500 whitespace-nowrap">NOME ${getSortIconIRP('nome')}</th>
                                <th onclick="window.sortIRP('pos')" class="px-1 py-3 text-[9px] font-jogos tracking-widest text-slate-500 uppercase cursor-pointer hover:text-orange-500 whitespace-nowrap">POS ${getSortIconIRP('pos')}</th>
                                <th onclick="window.sortIRP('jogos')" class="px-2 py-3 text-center text-[9px] font-jogos tracking-widest text-slate-500 uppercase cursor-pointer hover:text-orange-500 whitespace-nowrap">J ${getSortIconIRP('jogos')}</th>
                                <th onclick="window.sortIRP('media')" class="px-2 py-3 text-center text-[9px] font-jogos tracking-widest text-slate-500 uppercase cursor-pointer hover:text-orange-500 whitespace-nowrap">MÉD ${getSortIconIRP('media')}</th>
                                <th onclick="window.sortIRP('mpv')" class="px-2 py-3 text-center text-[9px] font-jogos tracking-widest text-slate-500 uppercase cursor-pointer hover:text-orange-500 whitespace-nowrap">MPV ${getSortIconIRP('mpv')}</th>
                                <th onclick="window.sortIRP('preco')" class="px-2 py-3 text-center text-[9px] font-jogos tracking-widest text-slate-500 uppercase cursor-pointer hover:text-orange-500 whitespace-nowrap">C$ ${getSortIconIRP('preco')}</th>
                                <th onclick="window.sortIRP('irp')" class="px-2 py-3 text-center text-[9px] font-jogos tracking-widest text-orange-500 uppercase cursor-pointer whitespace-nowrap">IRP ${getSortIconIRP('irp')}</th>
                            </tr>
                        </thead>
                        <tbody id="irp-tbody">
                            <tr>
                                <td colspan="7" class="text-center py-8">
                                    <div class="inline-flex items-center gap-3 text-slate-400">
                                        <div class="loader" style="width:20px;height:20px;border-width:2px;"></div>
                                        <span class="font-jogos text-xs uppercase tracking-widest">Carregando dados...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
 
            <!-- FÓRMULA — abaixo da tabela, tom suave -->
            <div class="mt-4 px-1">
                <p class="text-[9px] font-mono" style="color:#d1d5db;">
                    IRP = (Média ÷ MPV) × Preço × (min(jogos, 10) ÷ 10) &nbsp;·&nbsp; MPV negativo ou zero tratado como 0.01
                </p>
            </div>
 
        </div>
    `;
 
    container.insertAdjacentHTML('afterend', painelHtml);
 
    // Carrega dados e processa
    await carregarDadosIRP();
    processarIRP();
};
 
/* ============================================================
   HOOK – injeta o painel após renderAnaliseCartola
   ============================================================ */
 
(function hookAnalise() {
 
    const originalRender = window.renderAnaliseCartola;
 
    if (!originalRender) {
        // Se ainda não existe, aguarda
        const interval = setInterval(() => {
            if (window.renderAnaliseCartola) {
                clearInterval(interval);
                hookAnalise();
            }
        }, 100);
        return;
    }
 
    window.renderAnaliseCartola = async function() {
        await originalRender.apply(this, arguments);
        // Aguarda o DOM renderizar e injeta o painel IRP
        setTimeout(() => window.renderPainelIRP(), 100);
    };
 
})();
 
console.log("✅ IRP carregado – fórmula integrada à página ANÁLISE");
