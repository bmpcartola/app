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

        let lastScore = null;
        let lastPosition = 0;
        ordered.forEach((team, index) => {
            if (team.totalCents !== lastScore) {
                lastPosition = index + 1;
                lastScore = team.totalCents;
            }
            team.position = lastPosition;
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

    function renderTeamCard(team, index, isLeader) {
        const name = escapeHtml(team.name);
        const imagePath = ESCUDOS_PATH + encodeURIComponent(team.name) + ".png";
        const rankLabel = team.position + "º";
        const leaderClasses = isLeader
            ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-xl shadow-amber-100/70"
            : "border-slate-200 bg-white shadow-lg shadow-slate-200/50";

        return `
            <article class="ranking-geral-card relative overflow-hidden rounded-[28px] border ${leaderClasses} p-5 sm:p-6"
                     style="animation-delay:${index * 110}ms">
                ${isLeader ? '<div class="absolute right-0 top-0 rounded-bl-2xl bg-amber-400 px-4 py-2 text-[9px] font-black tracking-[.18em] text-amber-950">LÍDER GERAL</div>' : ""}
                <div class="flex items-center gap-4">
                    <div class="flex h-10 min-w-10 items-center justify-center rounded-2xl ${isLeader ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-500"} px-2 text-sm font-black">
                        ${rankLabel}
                    </div>
                    <div class="flex min-w-0 flex-1 items-center gap-3">
                        <div class="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl bg-white/80 p-2">
                            <img src="${imagePath}" alt="Escudo ${name}" loading="lazy"
                                 class="ranking-geral-shield max-h-full max-w-full object-contain"
                                 onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')">
                            <span class="hidden text-2xl font-black text-slate-300">${name.slice(0, 1)}</span>
                        </div>
                        <div class="min-w-0 pt-3">
                            <div class="mb-1 flex flex-wrap items-center gap-2">
                                <span class="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-black tracking-widest text-white">SÉRIE ${team.serie}</span>
                            </div>
                            <h3 class="break-words text-base font-black uppercase leading-tight tracking-tight text-slate-800 sm:text-lg">${name}</h3>
                            <p class="mt-1 text-[9px] font-bold uppercase leading-relaxed tracking-[.11em] text-slate-400">${escapeHtml(team.qualification)}</p>
                        </div>
                    </div>
                </div>
                <div class="mt-5 grid grid-cols-3 gap-2 border-t border-slate-200/70 pt-4">
                    <div>
                        <p class="text-[8px] font-black uppercase tracking-wider text-slate-400">1º turno</p>
                        <p class="mt-1 text-sm font-extrabold text-slate-700">${formatPoints(team.firstTurnCents)}</p>
                    </div>
                    <div>
                        <p class="text-[8px] font-black uppercase tracking-wider text-slate-400">2º turno</p>
                        <p class="mt-1 text-sm font-extrabold text-slate-700">${formatPoints(team.secondTurnCents)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[8px] font-black uppercase tracking-wider text-slate-400">Total</p>
                        <p class="ranking-geral-number mt-1 text-base font-black ${isLeader ? "text-amber-700" : "text-slate-900"}">${formatPoints(team.totalCents)}</p>
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
            const leader = result.ordered[0];
            const otherTeams = result.ordered.slice(1);

            main.innerHTML = `
                <section class="mx-auto max-w-6xl space-y-6 sm:space-y-8">
                    <header class="ranking-geral-card relative overflow-hidden rounded-[30px] bg-slate-950 px-5 py-7 text-white shadow-2xl shadow-slate-300/60 sm:px-8 sm:py-9">
                        <div class="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl"></div>
                        <div class="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[9px] font-black tracking-[.2em] text-amber-200">
                                    <i data-lucide="trophy" class="h-3.5 w-3.5"></i>
                                    DISPUTA GERAL • TAÇA BMP 2026
                                </div>
                                <h2 class="text-2xl font-black uppercase leading-none tracking-tight sm:text-4xl">Ranking Geral</h2>
                                <p class="mt-3 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                                    Os quatro classificados, somando a pontuação fixa do primeiro turno com o desempenho atualizado do segundo turno.
                                </p>
                            </div>
                            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:min-w-[180px]">
                                <p class="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Apuração automática</p>
                                <p class="mt-1 text-lg font-black text-amber-300">RDD ${result.firstRound}–${result.lastRound}</p>
                                <p class="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Segundo turno • ${result.roundsCount} rodadas</p>
                            </div>
                        </div>
                    </header>

                    <section class="ranking-geral-card relative overflow-hidden rounded-[30px] border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-xl shadow-amber-100/70 sm:p-7"
                             style="animation-delay:100ms">
                        <div class="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-amber-200/40 blur-3xl"></div>
                        <div class="relative grid items-center gap-5 sm:grid-cols-[1fr_auto]">
                            <div class="flex items-center gap-4 sm:gap-6">
                                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-lg shadow-amber-200">
                                    <i data-lucide="crown" class="h-7 w-7"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[9px] font-black uppercase tracking-[.22em] text-amber-700">1º lugar • líder geral</p>
                                    <h3 class="mt-1 break-words text-2xl font-black uppercase leading-tight tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(leader.name)}</h3>
                                    <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Série ${leader.serie} • ${escapeHtml(leader.qualification)}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-4 sm:justify-end">
                                <img src="${ESCUDOS_PATH + encodeURIComponent(leader.name) + ".png"}" alt="Escudo ${escapeHtml(leader.name)}"
                                     class="ranking-geral-shield h-20 w-20 object-contain sm:h-24 sm:w-24">
                                <div class="min-w-[120px]">
                                    <p class="text-[9px] font-black uppercase tracking-[.18em] text-amber-700">Pontuação total</p>
                                    <p class="ranking-geral-number mt-1 text-3xl font-black text-amber-700 sm:text-4xl">${formatPoints(leader.totalCents)}</p>
                                </div>
                            </div>
                        </div>
                        <div class="relative mt-6 grid grid-cols-2 gap-3 border-t border-amber-200/80 pt-4 sm:max-w-md">
                            <div>
                                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">1º turno</p>
                                <p class="mt-1 text-lg font-black text-slate-700">${formatPoints(leader.firstTurnCents)}</p>
                            </div>
                            <div>
                                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">2º turno</p>
                                <p class="mt-1 text-lg font-black text-slate-700">${formatPoints(leader.secondTurnCents)}</p>
                            </div>
                        </div>
                    </section>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        ${otherTeams.map((team, index) => renderTeamCard(team, index + 2, false)).join("")}
                    </div>

                    <footer class="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-center">
                        <p class="text-[9px] font-bold uppercase leading-relaxed tracking-[.12em] text-slate-400">
                            Pontuação do 1º turno fixa • 2º turno calculado por VAL + RE − PEN a partir da rodada 20
                        </p>
                    </footer>
                </section>
            `;
        } catch (error) {
            console.error("Erro ao calcular o Ranking Geral:", error);
            renderError(main, error.message || "Ocorreu um erro inesperado ao calcular o ranking.");
        }
    };
})();
