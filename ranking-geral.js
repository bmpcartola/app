/* ============================================================
   TAÇA BMP 2026 — RANKING GERAL
   Calcula automaticamente os classificados e a pontuação geral.
   O primeiro turno vem de bd/pontos-primeiro-turno.js.
   O segundo turno é calculado de bd/cartola.json (rodada 20+).
   ============================================================ */

(() => {
    const INICIO_SEGUNDO_TURNO = 20;
    const ESCUDOS_PATH = "images/lider/";

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function toCents(value) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.round(number * 100) : 0;
    }

    function formatPoints(cents) {
        return (cents / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function addStyles() {
        if (document.getElementById("ranking-geral-styles")) return;

        const style = document.createElement("style");
        style.id = "ranking-geral-styles";
        style.textContent = `
            @keyframes rankingGeralEnter {
                from { opacity: 0; transform: translateY(22px) scale(.985); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes rankingGeralFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
            }
            .ranking-geral-card {
                animation: rankingGeralEnter .65s cubic-bezier(.2,.75,.25,1) both;
            }
            .ranking-geral-shield {
                animation: rankingGeralFloat 4s ease-in-out infinite;
                filter: drop-shadow(0 8px 10px rgba(15,23,42,.14));
            }
            .ranking-geral-number {
                font-variant-numeric: tabular-nums;
                letter-spacing: -.045em;
            }
            @media (prefers-reduced-motion: reduce) {
                .ranking-geral-card, .ranking-geral-shield {
                    animation: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function calculateSerie(teams, serie) {
        if (!Array.isArray(teams)) {
            throw new Error("Não foi possível localizar os dados da Série " + serie + " em bd/cartola.json.");
        }

        return teams.map(team => {
            const rounds = (Array.isArray(team.rodadas) ? team.rodadas : [])
                .filter(round => Number(round.rdd) >= INICIO_SEGUNDO_TURNO);

            const pointsCents = rounds.reduce((total, round) => {
                return total
                    + toCents(round.val)
                    + toCents(round.re)
                    - toCents(round.pen);
            }, 0);

            return {
                name: team.nome,
                serie,
                pointsCents,
                rounds: rounds.map(round => Number(round.rdd))
            };
        }).sort((a, b) => b.pointsCents - a.pointsCents);
    }

    function getUniquePosition(ranking, position, serie, reason) {
        const current = ranking[position - 1];
        const next = ranking[position];

        if (!current) {
            throw new Error("Não há competidores suficientes na Série " + serie + " para identificar " + reason + ".");
        }

        if (next && current.pointsCents === next.pointsCents) {
            throw new Error(
                "Empate na " + reason + " da Série " + serie +
                " entre " + current.name + " e " + next.name +
                ". Não existe critério de desempate definido nesta implementação; é necessária a confirmação do regulamento."
            );
        }

        return current;
    }

    function buildRanking(data) {
        const fixedScores = window.BMP_PONTOS_PRIMEIRO_TURNO;
        const firstTurnChampions = window.BMP_CAMPEOES_PRIMEIRO_TURNO;

        if (!fixedScores || !firstTurnChampions) {
            throw new Error("A pontuação fixa do primeiro turno não foi carregada. Verifique bd/pontos-primeiro-turno.js.");
        }

        const serieA = calculateSerie(data.serieA, "A");
        const serieB = calculateSerie(data.serieB, "B");
        const series = { A: serieA, B: serieB };
        const qualifiers = [];

        ["A", "B"].forEach(serie => {
            const firstChampionName = firstTurnChampions[serie];
            const firstTurnPoints = fixedScores[serie][firstChampionName];

            if (!Number.isFinite(Number(firstTurnPoints))) {
                throw new Error("Não há pontuação fixa cadastrada para " + firstChampionName + " na Série " + serie + ".");
            }

            // As séries podem ter composições diferentes entre os turnos.
            // Localiza o campeão do 1º turno em qualquer série do JSON atual.
            const firstChampionTeam = [...serieA, ...serieB].find(team => team.name === firstChampionName);
            if (!firstChampionTeam) {
                throw new Error("O campeão do primeiro turno " + firstChampionName + " não foi encontrado em bd/cartola.json.");
            }

            qualifiers.push({
                name: firstChampionName,
                serie,
                qualification: "CAMPEÃO DO 1º TURNO",
                firstTurnCents: toCents(firstTurnPoints),
                secondTurnCents: firstChampionTeam.pointsCents
            });

            const secondTurnChampion = getUniquePosition(series[serie], 1, serie, "primeira colocação do segundo turno");
            const transferred = secondTurnChampion.name === firstChampionName;
            const secondTurnQualifier = transferred
                ? getUniquePosition(series[serie], 2, serie, "vice-campeonato necessário para transferência da vaga")
                : secondTurnChampion;

            // O cadastro fixo identifica a série do 1º turno; o classificado
            // pode estar na outra série no segundo turno após a reorganização.
            const secondTurnPoints = fixedScores.A[secondTurnQualifier.name] ?? fixedScores.B[secondTurnQualifier.name];
            if (!Number.isFinite(Number(secondTurnPoints))) {
                throw new Error("Não há pontuação fixa do primeiro turno para " + secondTurnQualifier.name + ".");
            }

            qualifiers.push({
                name: secondTurnQualifier.name,
                serie,
                qualification: transferred
                    ? "VICE-CAMPEÃO DO 2º TURNO • VAGA TRANSFERIDA"
                    : "CAMPEÃO DO 2º TURNO",
                firstTurnCents: toCents(secondTurnPoints),
                secondTurnCents: secondTurnQualifier.pointsCents
            });
        });

        const uniqueNames = new Set(qualifiers.map(team => team.name));
        if (uniqueNames.size !== 4) {
            throw new Error("A seleção automática não resultou em quatro competidores distintos. Confira os campeões e os dados das séries.");
        }

        const ordered = qualifiers.map((team, index) => ({
            ...team,
            totalCents: team.firstTurnCents + team.secondTurnCents,
            originalOrder: index
        })).sort((a, b) => b.totalCents - a.totalCents || a.originalOrder - b.originalOrder);

        for (let index = 1; index < ordered.length; index++) {
            if (ordered[index - 1].totalCents === ordered[index].totalCents) {
                throw new Error(
                    "Empate na pontuação total entre " + ordered[index - 1].name +
                    " e " + ordered[index].name +
                    ". O regulamento não informa um critério de desempate para o Ranking Geral."
                );
            }
        }

        ordered.forEach((team, index) => {
            team.position = index + 1;
        });

        const allRounds = [...serieA, ...serieB].flatMap(team => team.rounds);
        const usedRounds = [...new Set(allRounds)].sort((a, b) => a - b);

        return {
            ordered,
            series,
            firstRound: usedRounds.length ? usedRounds[0] : INICIO_SEGUNDO_TURNO,
            lastRound: usedRounds.length ? usedRounds[usedRounds.length - 1] : INICIO_SEGUNDO_TURNO,
            roundsCount: usedRounds.length
        };
    }

    function renderTeamCard(team, index) {
        const name = escapeHtml(team.name);
        const imagePath = ESCUDOS_PATH + encodeURIComponent(team.name) + ".png";
        const isLeader = index === 0;
        const cardClasses = isLeader
            ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-xl shadow-amber-100/70"
            : "border-slate-200 bg-white shadow-lg shadow-slate-200/50";

        return `
            <article class="ranking-geral-card flex flex-col items-center gap-4 rounded-[28px] border ${cardClasses} p-5 sm:flex-row sm:gap-6 sm:p-6"
                     style="animation-delay:${index * 100}ms">
                <div class="flex w-full items-center gap-4 sm:w-auto sm:shrink-0">
                    <div class="flex h-12 min-w-12 items-center justify-center rounded-2xl ${isLeader ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-600"} px-2 text-lg font-black">
                        ${team.position}º
                    </div>
                    <div class="flex h-[140px] w-[140px] shrink-0 items-center justify-center rounded-2xl bg-white p-2 sm:h-[151px] sm:w-[151px]">
                        <img src="${imagePath}" alt="Escudo ${name}" loading="lazy"
                             class="ranking-geral-shield max-h-full max-w-full scale-[1.3] object-contain"
                             onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')">
                        <span class="hidden text-3xl font-black text-slate-300">${name.slice(0, 1)}</span>
                    </div>
                    <h3 class="min-w-0 flex-1 break-words text-lg font-black uppercase leading-tight tracking-tight text-slate-800 sm:hidden">${name}</h3>
                </div>

                <div class="w-full min-w-0 flex-1">
                    <h3 class="mb-4 hidden break-words text-xl font-black uppercase leading-tight tracking-tight text-slate-800 sm:block">${name}</h3>
                    <div class="grid w-full grid-cols-3 gap-2 border-t border-slate-200/70 pt-4 sm:border-t-0 sm:pt-0">
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">1º turno</p>
                            <p class="mt-1 text-sm font-extrabold text-slate-700 sm:text-base">${formatPoints(team.firstTurnCents)}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">2º turno</p>
                            <p class="mt-1 text-sm font-extrabold text-slate-700 sm:text-base">${formatPoints(team.secondTurnCents)}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">Total</p>
                            <p class="ranking-geral-number mt-1 text-[21px] font-black ${isLeader ? "text-amber-700" : "text-slate-900"} sm:text-[24px]">${formatPoints(team.totalCents)}</p>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    function renderError(main, message) {
        main.innerHTML = `
            <section class="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm sm:p-8">
                <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <i data-lucide="alert-triangle" class="h-6 w-6"></i>
                </div>
                <h2 class="text-lg font-black uppercase tracking-tight text-slate-800">Não foi possível calcular o ranking</h2>
                <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">${escapeHtml(message)}</p>
            </section>
        `;
    }

    window.renderRankingGeral = function renderRankingGeral() {
        const main = document.getElementById("main-content");
        if (!main) return;

        addStyles();

        try {
            const data = typeof bmpData !== "undefined" ? bmpData : window.bmpData;
            if (!data) {
                throw new Error("Os dados da competição ainda não foram carregados. Aguarde a sincronização e tente novamente.");
            }

            const result = buildRanking(data);

            main.innerHTML = `
                <section class="mx-auto max-w-5xl space-y-5 sm:space-y-6">
                    <header class="ranking-geral-card py-2 text-center sm:py-4">
                        <h2 class="text-3xl font-black uppercase leading-none tracking-tight text-slate-900 sm:text-4xl">RANKING GERAL</h2>
                    </header>

                    <div class="space-y-4">
                        ${result.ordered.map((team, index) => renderTeamCard(team, index)).join("")}
                    </div>
                </section>
            `;

        } catch (error) {
            console.error("Erro ao calcular o Ranking Geral:", error);
            renderError(main, error.message || "Ocorreu um erro inesperado ao calcular o ranking.");
        }
    };
})();
