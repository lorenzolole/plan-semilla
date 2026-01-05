/**
 * 🚀 MARKET CLOCK WIDGET LOGIC
 * Handles conversion between ET (New York) and UYT (Montevideo).
 * Updates the widget UI with real-time status.
 * Features: Draggable (1:1), Collapsible (anchored to right), Persistence.
 */

const MarketClock = (() => {
    // Configuration
    const CONFIG = {
        holidays2026: [
            "2026-01-01", "2026-01-20", "2026-02-17",
            "2026-04-03", "2026-05-26", "2026-06-19",
            "2026-07-04", "2026-09-07", "2026-11-26",
            "2026-12-25"
        ],
        marketHours: {
            preMarket: { start: 700, end: 1230 },   // 07:00 - 12:30 UYT
            open: { start: 1230, end: 1900 },       // 12:30 - 19:00 UYT
            afterHours: { start: 1900, end: 2300 }  // 19:00 - 23:00 UYT
        },
        STORAGE_KEY: 'market_clock_state'
    };

    // DOM Elements
    let container = null;
    let mainContent = null;
    let collapsedBtn = null;
    let statusEl = null;
    let timeLeftEl = null;

    // State
    let state = {
        isCollapsed: false,
        top: '100px',
        left: 'auto', // Default: will calculate or use right
        right: '16px' // Default right spacing
    };

    function init() {
        loadState();
        createWidget();
        restoreState();
        updateClock();
        setInterval(updateClock, 30000);
    }

    function loadState() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            try {
                state = { ...state, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('Failed to parse market clock state', e);
            }
        }
    }

    function saveState() {
        if (!container) return;

        // Update state from current DOM
        state.isCollapsed = mainContent.classList.contains('hidden');
        state.top = container.style.top;
        state.left = container.style.left;
        // logic: if left is set, we use left. if not, we rely on default right (for initial load)

        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
    }

    function restoreState() {
        if (!container) return;

        // Restore Position
        // If we have a stored 'left' position that isn't auto, use it.
        // Otherwise it defaults to the CSS class (top-24 right-4)
        if (state.left && state.left !== 'auto') {
            container.style.top = state.top;
            container.style.left = state.left;
            container.style.right = 'auto'; // Disable right anchor if custom positioned
        }

        // Restore Collapsed State
        if (state.isCollapsed) {
            // Force collapse immediately without transition for initial load
            mainContent.classList.add('hidden');
            collapsedBtn.classList.remove('hidden');
            container.style.cursor = 'default';
        }
    }

    function createWidget() {
        // Prevent dupes
        if (document.getElementById('market-clock-widget')) return;

        const div = document.createElement('div');
        div.id = 'market-clock-widget';
        // Note: z-50 to ensure it is above most things. transition-none class added dynamically when dragging.
        div.className = 'fixed top-24 right-4 z-[9999] hidden md:flex flex-col items-end transition-all duration-300 select-none touch-none';

        // Add specific styles for transform origin to ensure right-side collapse visual
        div.style.transformOrigin = 'right center';

        div.innerHTML = `
            <!-- Collapsed State (Tiny Button) - Aligned Right -->
            <button id="mc-collapsed-btn" class="hidden market-glass p-2 rounded-full shadow-lg hover:bg-white/80 transition-all group backdrop-blur-md border border-gray-200 dark:border-gray-600 relative cursor-pointer">
                <span class="text-xl">⏰</span>
                <span class="absolute -top-1 -right-1 flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
            </button>

            <!-- Expanded Content -->
            <div id="mc-content" class="market-glass p-3 rounded-xl border shadow-lg w-64 backdrop-blur-md relative bg-white/70 dark:bg-slate-900/70 origin-right transition-transform duration-300">
                <!-- Header / Drag Handle -->
                <div id="mc-handle" class="flex items-center justify-between mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 cursor-move pointer-events-auto">
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <i class="fa-solid fa-grip-lines text-slate-400 mr-1"></i>
                        BOLSA USA <i class="fa-solid fa-arrow-right text-[10px] mx-1"></i> UY
                    </span>
                    <div class="flex items-center gap-2">
                        <span id="mc-flag" class="text-xs">🇺🇸/🇺🇾</span>
                        <button id="mc-minimize-btn" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
                            <i class="fa-solid fa-minus text-xs"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Content Status -->
                <div class="mb-3 pointer-events-none">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-100">NYSE/Nasdaq</span>
                        <div id="mc-status-badge" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600">
                            CERRADO
                        </div>
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <i class="fa-regular fa-clock"></i>
                        <span id="mc-time-left">--:--</span>
                    </div>
                </div>

                <!-- Crypto -->
                <div class="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-700 pointer-events-none">
                    <div class="flex items-center gap-1">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-100">Crypto 24/7</span>
                    </div>
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        ABIERTO
                    </span>
                </div>
                
                <div class="mt-2 text-[10px] text-center text-slate-400 dark:text-slate-500 italic pointer-events-none" id="mc-next-open"></div>
            </div>
        `;
        document.body.appendChild(div);

        // Cache elements
        container = div;
        mainContent = document.getElementById('mc-content');
        collapsedBtn = document.getElementById('mc-collapsed-btn');
        statusEl = document.getElementById('mc-status-badge');
        timeLeftEl = document.getElementById('mc-time-left');

        // Listeners for Collapse
        document.getElementById('mc-minimize-btn').addEventListener('click', toggleCollapse);

        // Only trigger toggle if NOT dragged (checked via simple dataset flag controlled by makeDraggable)
        collapsedBtn.addEventListener('click', (e) => {
            if (container.dataset.isDragging === 'true') {
                e.stopImmediatePropagation();
                e.preventDefault();
                return;
            }
            toggleCollapse(e);
        });

        // Make Draggable (both handles)
        makeDraggable(div, document.getElementById('mc-handle'));
        makeDraggable(div, collapsedBtn);
    }

    function toggleCollapse(e) {
        if (e) e.stopPropagation();

        const widthExpanded = 256; // w-64
        const widthCollapsed = 40; // approx button size

        const isCustomPositioned = container.style.right !== '4px' && container.style.left !== 'auto';

        if (!mainContent.classList.contains('hidden')) {
            // GOING TO COLLAPSE
            if (isCustomPositioned) {
                const currentLeft = parseInt(container.style.left || container.getBoundingClientRect().left);
                const shift = widthExpanded - widthCollapsed;
                container.style.left = (currentLeft + shift) + 'px';
            }

            mainContent.classList.add('hidden');
            collapsedBtn.classList.remove('hidden');
            container.style.cursor = 'default';
        } else {
            // GOING TO EXPAND
            if (isCustomPositioned) {
                const currentLeft = parseInt(container.style.left || container.getBoundingClientRect().left);
                const shift = widthExpanded - widthCollapsed;
                container.style.left = (currentLeft - shift) + 'px';
            }

            mainContent.classList.remove('hidden');
            collapsedBtn.classList.add('hidden');
            container.style.cursor = 'move';
        }

        saveState();
    }

    function makeDraggable(element, handle) {
        let offsetX = 0, offsetY = 0;
        let startX = 0, startY = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();

            // Reset drag flag
            element.dataset.isDragging = 'false';

            const rect = element.getBoundingClientRect();

            // Undock if needed
            if (element.style.right !== 'auto') {
                element.style.left = rect.left + 'px';
                element.style.top = rect.top + 'px';
                element.style.right = 'auto';
            }

            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            startX = e.clientX;
            startY = e.clientY;

            // Remove transition
            element.classList.remove('transition-all', 'duration-300');

            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
        }

        function elementDrag(e) {
            e.preventDefault();

            const currentX = e.clientX;
            const currentY = e.clientY;

            // Check if we moved enough to consider it a drag
            if (Math.abs(currentX - startX) > 3 || Math.abs(currentY - startY) > 3) {
                element.dataset.isDragging = 'true';
            }

            let newX = currentX - offsetX;
            let newY = currentY - offsetY;

            // Boundary Checks
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            newX = Math.max(0, Math.min(maxX, newX));
            newY = Math.max(0, Math.min(maxY, newY));

            element.style.left = newX + "px";
            element.style.top = newY + "px";
        }

        function closeDragElement() {
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', elementDrag);

            element.classList.add('transition-all', 'duration-300');
            saveState();

            // Allow click to potentially fire after this, but the click listener checks dataset.isDragging
            // We clear the flag after a short timeout to ensure click handler sees it
            setTimeout(() => {
                element.dataset.isDragging = 'false';
            }, 100);
        }
    }

    function getUruguayTime() {
        return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Montevideo" }));
    }

    function isHoliday(date) {
        const dateStr = date.toISOString().split('T')[0];
        if (CONFIG.holidays2026.includes(dateStr)) return true;
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    function updateClock() {
        if (!container) return;

        const now = getUruguayTime();
        const nowHours = now.getHours();
        const nowMinutes = now.getMinutes();
        const currentTimeVal = nowHours * 100 + nowMinutes;

        const isWeekendOrHoliday = isHoliday(now);
        let status = 'CLOSED';
        let statusText = 'CERRADO';
        let statusColor = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
        let timeLeftText = '';

        if (!isWeekendOrHoliday) {
            const { preMarket, open, afterHours } = CONFIG.marketHours;

            if (currentTimeVal >= open.start && currentTimeVal < open.end) {
                statusText = '🟢 ABIERTO';
                statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
                const closeTime = new Date(now);
                closeTime.setHours(19, 0, 0, 0);
                const diffMs = closeTime - now;
                const hrs = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                timeLeftText = `Cierre en ${hrs}h ${mins}m (19:00)`;

            } else if (currentTimeVal >= preMarket.start && currentTimeVal < preMarket.end) {
                statusText = '🟡 PRE-MARKET';
                statusColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
                timeLeftText = `Apertura 12:30 UYT`;
            } else if (currentTimeVal >= afterHours.start && currentTimeVal < afterHours.end) {
                statusText = '🟠 AFTER-HOURS';
                statusColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                timeLeftText = `Cierre After 23:00 UYT`;
            } else {
                timeLeftText = `Apertura Lunes 12:30 UYT`;
                if (nowHours >= 23) timeLeftText = `Próx. sesión: Mañana 07:00 UYT`;
            }
        } else {
            timeLeftText = `Apertura: Prox. día hábil 12:30`;
        }

        statusEl.className = `px-1.5 py-0.5 rounded text-[10px] font-bold ${statusColor}`;
        statusEl.textContent = statusText;
        timeLeftEl.textContent = timeLeftText;
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    // Shorter timeout to ensure it feels responsive, but safe for DOM
    setTimeout(MarketClock.init, 500);
});
