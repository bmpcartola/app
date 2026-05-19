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

    sortColumn: 'matchup',
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

        <div class="max-w-[1900px] mx-auto space-y-6">

            <!-- HEADER -->
            <div class="bg-white rounded-[40px] border border-slate-100 shadow-sm p-5 md:p-8">

                <div class="flex items-center gap-5 mb-8">

                    <div class="w-20 h-20 rounded-[28px] bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 shrink-0">

                        <svg xmlns="http://www.w3.org/2000/svg"
                             width="42"
                             height="42"
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

                    <div class="min-w-0">

                        <h1 class="font-jersey text-4xl md:text-5xl text-slate-800 leading-none">
                            ANÁLISE
                        </h1>

                        <p class="font-jogos text-[10px] md:text-xs tracking-[0.35em] text-slate-400 uppercase mt-2">
                            MATCHUPS ANALÍTICOS
                        </p>

                    </div>

                </div>

                <!-- CONTROLES -->
                <div class="grid grid-cols-1 xl:grid-cols-4 gap-5">

                    <!-- SCOUT -->
                    <div>

                        <label class="block text-[10px] font-jogos tracking-[0.25em] text-slate-400 uppercase mb-2">
                            Scout
                        </label>

                        <select id="select-scout"
                                onchange="window.handleScoutChange(this.value)"
                                class="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 font-black text-slate-700 outline-none focus:border-orange-400">

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
                                class="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 font-black text-slate-700 outline-none focus:border-orange-400">

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
                                    class="flex-1 h-14 rounded-2xl bg-orange-500 text-white font-black text-sm transition-all">
                                MANDANTE
                            </button>

                            <button onclick="window.handleModoAnalise('VISITANTE')"
                                    id="btn-visitante"
                                    class="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm transition-all">
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
            'flex-1 h-14 rounded-2xl bg-orange-500 text-white font-black text-sm transition-all';

        btnVisitante.className =
            'flex-1 h-14 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm transition-all';

    } else {

        btnVisitante.className =
            'flex-1 h-14 rounded-2xl bg-orange-500 text-white font-black text-sm transition-all';

        btnMandante.className =
            'flex-1 h-14 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm transition-all';
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

/* ============================================================
   SCOUT CONQUISTADO
   ============================================================ */

function obterScoutConquistado(clubeId, scout, posicao, ultimasRodadas, mando) {

    if (!window.dadosCartola || !window.dadosCartola.times) {
        return 0;
    }

    const scoutsAlvo = SCOUTS_MAP[scout] || [];

    let total = 0;
    let partidasValidas = [];

    const partidas = window.dadosCartola.times[getTeamName(clubeId)];

    if (!partidas) return 0;

    partidas.forEach(partida => {

        if (partida.rodada >= analiseState.rodadaAtual) return;

        if (partida.mando !== mando) return;

        partidasValidas.push(partida);

    });

    partidasValidas = partidasValidas
        .sort((a, b) => b.rodada - a.rodada)
        .slice(0, ultimasRodadas);

    partidasValidas.forEach(partida => {

        if (scout === 'SG') {

            const teveSG = partida.atletas.some(a => Number(a.SG) > 0);

            if (teveSG) total += 1;

            return;
        }

        partida.atletas.forEach(atleta => {

            if (posicao !== 'GERAL' && atleta.pos !== posicao) {
                return;
            }

            scoutsAlvo.forEach(sc => {
                total += Number(atleta[sc] || 0);
            });

        });

    });

    if (partidasValidas.length === 0) return 0;

    return Number((total / partidasValidas.length).toFixed(2));
}

/* ============================================================
   SCOUT CEDIDO
   ============================================================ */

function obterScoutCedidos(clubeId, scout, posicao, ultimasRodadas, tipoMando) {

    if (!window.dadosCartola || !window.dadosCartola.times) {
        return 0;
    }

    const scoutsAlvo = SCOUTS_MAP[scout] || [];

    let total = 0;
    let partidasValidas = [];

    Object.values(window.dadosCartola.times).forEach(partidas => {

        partidas.forEach(partida => {

            if (partida.id_adv !== clubeId) return;

            if (partida.rodada >= analiseState.rodadaAtual) return;

            if (partida.mando !== tipoMando) return;

            partidasValidas.push(partida);

        });

    });

    partidasValidas = partidasValidas
        .sort((a, b) => b.rodada - a.rodada)
        .slice(0, ultimasRodadas);

    partidasValidas.forEach(partida => {

        if (scout === 'SG') {

            const teveSG = partida.atletas.some(a => Number(a.SG) > 0);

            if (teveSG) total += 1;

            return;
        }

        partida.atletas.forEach(atleta => {

            if (posicao !== 'GERAL' && atleta.pos !== posicao) {
                return;
            }

            scoutsAlvo.forEach(sc => {
                total += Number(atleta[sc] || 0);
            });

        });

    });

    if (partidasValidas.length === 0) return 0;

    return Number((total / partidasValidas.length).toFixed(2));
}

/* ============================================================
   RENDER TABELA
   ============================================================ */

function renderTabelaCedidos() {

    const container = document.getElementById('analise-tabela');

    if (!container) return;

    let matchups = [];

    analiseState.partidas.forEach(match => {

        let valorCasa = 0;
        let valorFora = 0;

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

        matchups.push({

            casaId: match.clube_casa_id,
            foraId: match.clube_visitante_id,

            casa: getTeamName(match.clube_casa_id),
            fora: getTeamName(match.clube_visitante_id),

            valorCasa,
            valorFora,

            matchup: Number((valorCasa + valorFora).toFixed(2))
        });

    });

    /* ============================================================
       SORT
       ============================================================ */

    matchups.sort((a, b) => {

        const dir = analiseState.sortDirection === 'asc' ? 1 : -1;

        if (a[analiseState.sortColumn] < b[analiseState.sortColumn]) {
            return -1 * dir;
        }

        if (a[analiseState.sortColumn] > b[analiseState.sortColumn]) {
            return 1 * dir;
        }

        return 0;
    });

    /* ============================================================
       RENDER
       ============================================================ */

    container.innerHTML = `

        <!-- DESKTOP -->
        <div class="hidden lg:block bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">

            <!-- HEADER -->
            <div class="grid grid-cols-[1.2fr_140px_80px_140px_1.2fr_160px] gap-2 px-8 py-5 bg-slate-50 border-b border-slate-100">

                <button onclick="window.sortTabelaAnalise('casa')"
                        class="text-left text-xs font-jogos tracking-[0.2em] text-slate-400 uppercase hover:text-orange-500 transition-all">
                    CASA
                </button>

                <button onclick="window.sortTabelaAnalise('valorCasa')"
                        class="text-center text-xs font-jogos tracking-[0.2em] text-slate-400 uppercase hover:text-orange-500 transition-all">
                    ${analiseState.modoAnalise === 'MANDANTE' ? 'CONQ' : 'CED'}
                </button>

                <div></div>

                <button onclick="window.sortTabelaAnalise('valorFora')"
                        class="text-center text-xs font-jogos tracking-[0.2em] text-slate-400 uppercase hover:text-orange-500 transition-all">
                    ${analiseState.modoAnalise === 'MANDANTE' ? 'CED' : 'CONQ'}
                </button>

                <button onclick="window.sortTabelaAnalise('fora')"
                        class="text-right text-xs font-jogos tracking-[0.2em] text-slate-400 uppercase hover:text-orange-500 transition-all">
                    FORA
                </button>

                <button onclick="window.sortTabelaAnalise('matchup')"
                        class="text-center text-xs font-jogos tracking-[0.2em] text-slate-400 uppercase hover:text-orange-500 transition-all">
                    MATCHUP
                </button>

            </div>

            ${matchups.map(item => `

                <div class="grid grid-cols-[1.2fr_140px_80px_140px_1.2fr_160px] gap-2 px-8 py-5 border-b border-slate-50 hover:bg-orange-50/40 transition-all items-center">

                    <!-- CASA -->
                    <div class="flex items-center gap-3 min-w-0">

                        <img src="${getShield(item.casaId)}"
                             class="w-12 h-12 object-contain shrink-0">

                        <span class="font-black text-slate-800 text-base truncate">
                            ${item.casa}
                        </span>

                    </div>

                    <!-- VALOR CASA -->
                    <div class="flex justify-center">

                        <div class="${analiseState.modoAnalise === 'MANDANTE'
                            ? 'bg-green-50 border-green-100 text-green-700'
                            : 'bg-orange-50 border-orange-100 text-orange-700'}
                            min-w-[100px]
                            h-14
                            rounded-2xl
                            border
                            flex items-center justify-center
                            font-black text-2xl">

                            ${item.valorCasa.toFixed(2)}

                        </div>

                    </div>

                    <!-- X -->
                    <div class="flex justify-center">

                        <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">

                            <span class="font-jogos text-slate-300 text-lg">
                                X
                            </span>

                        </div>

                    </div>

                    <!-- VALOR FORA -->
                    <div class="flex justify-center">

                        <div class="${analiseState.modoAnalise === 'MANDANTE'
                            ? 'bg-orange-50 border-orange-100 text-orange-700'
                            : 'bg-green-50 border-green-100 text-green-700'}
                            min-w-[100px]
                            h-14
                            rounded-2xl
                            border
                            flex items-center justify-center
                            font-black text-2xl">

                            ${item.valorFora.toFixed(2)}

                        </div>

                    </div>

                    <!-- FORA -->
                    <div class="flex items-center justify-end gap-3 min-w-0">

                        <span class="font-black text-slate-800 text-base truncate">
                            ${item.fora}
                        </span>

                        <img src="${getShield(item.foraId)}"
                             class="w-12 h-12 object-contain shrink-0">

                    </div>

                    <!-- MATCHUP -->
                    <div class="flex justify-center">

                        <div class="min-w-[120px]
                                    h-14
                                    rounded-2xl
                                    bg-slate-900
                                    text-white
                                    flex items-center justify-center
                                    font-black text-2xl">

                            ${item.matchup.toFixed(2)}

                        </div>

                    </div>

                </div>

            `).join('')}

        </div>

        <!-- MOBILE -->
        <div class="lg:hidden space-y-4">

            ${matchups.map(item => `

                <div class="bg-white rounded-[30px] border border-slate-100 shadow-sm p-5">

                    <div class="flex items-center justify-between gap-4">

                        <!-- CASA -->
                        <div class="flex flex-col items-center gap-3 flex-1 min-w-0">

                            <img src="${getShield(item.casaId)}"
                                 class="w-14 h-14 object-contain">

                            <p class="font-black text-slate-800 text-sm uppercase truncate">
                                ${item.casa}
                            </p>

                            <div class="${analiseState.modoAnalise === 'MANDANTE'
                                ? 'bg-green-50 border-green-100 text-green-700'
                                : 'bg-orange-50 border-orange-100 text-orange-700'}
                                w-full h-12 rounded-2xl border flex items-center justify-center font-black text-xl">

                                ${item.valorCasa.toFixed(2)}

                            </div>

                        </div>

                        <!-- CENTRO -->
                        <div class="flex flex-col items-center gap-3">

                            <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">

                                <span class="font-jogos text-slate-300">
                                    X
                                </span>

                            </div>

                            <div class="w-16 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                                ${item.matchup.toFixed(2)}
                            </div>

                        </div>

                        <!-- FORA -->
                        <div class="flex flex-col items-center gap-3 flex-1 min-w-0">

                            <img src="${getShield(item.foraId)}"
                                 class="w-14 h-14 object-contain">

                            <p class="font-black text-slate-800 text-sm uppercase truncate">
                                ${item.fora}
                            </p>

                            <div class="${analiseState.modoAnalise === 'MANDANTE'
                                ? 'bg-orange-50 border-orange-100 text-orange-700'
                                : 'bg-green-50 border-green-100 text-green-700'}
                                w-full h-12 rounded-2xl border flex items-center justify-center font-black text-xl">

                                ${item.valorFora.toFixed(2)}

                            </div>

                        </div>

                    </div>

                </div>

            `).join('')}

        </div>

    `;
}
