/* ============================================================
   DADOS CARTOLA — MOTOR ANALÍTICO
   ============================================================ */

window.renderAnaliseCartola = function () {

    const main = document.getElementById("main-content");

    if (!main) return;

    main.innerHTML = `

        <div class="max-w-7xl mx-auto">

            <div class="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">

                <div class="flex items-center gap-4 mb-6">

                    <div class="w-20 h-20 rounded-[28px] bg-orange-50 flex items-center justify-center text-orange-500">

                        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 3v18h18"/>
                            <path d="M7 14l3-3 3 2 4-5"/>
                            <circle cx="7" cy="14" r="1" fill="currentColor"/>
                            <circle cx="10" cy="11" r="1" fill="currentColor"/>
                            <circle cx="13" cy="13" r="1" fill="currentColor"/>
                            <circle cx="17" cy="8" r="1" fill="currentColor"/>
                        </svg>

                    </div>

                    <div>
                        <h1 class="font-jersey text-5xl text-slate-800">ANÁLISE</h1>
                        <p class="text-slate-400 font-jogos text-xs tracking-[0.3em] uppercase mt-1">
                            MOTOR ANALÍTICO CARTOLA
                        </p>
                    </div>

                </div>

                <div class="bg-slate-50 rounded-3xl border border-slate-100 p-8">

                    <p class="font-jogos text-sm text-slate-400 tracking-[0.2em] uppercase">
                        Estrutura analítica inicial carregada.
                    </p>

                </div>

            </div>

        </div>

    `;

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
};
