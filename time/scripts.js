document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const BASE_TITLE = 'Timer & Stopwatch';
    const $ = (id) => document.getElementById(id);

    const timerTab = $('timer-tab');
    const stopwatchTab = $('stopwatch-tab');
    const timerPanel = $('timer');
    const stopwatchPanel = $('stopwatch');
    const timerDisplay = $('timer-display');
    const stopwatchDisplay = $('stopwatch-display');
    const timerError = $('timer-error');
    const startTimerBtn = $('start-timer');
    const resetTimerBtn = $('reset-timer');
    const startStopwatchBtn = $('start-stopwatch');
    const resetStopwatchBtn = $('reset-stopwatch');

    // --- Állapot. Minden abszolút időbélyeg, semmit nem növelünk lépésenként,
    //     így a háttérbe tett fül nem tud elcsúszást okozni.
    let timerEndTime = 0;      // mikor jár le (ms epoch)
    let timerRemaining = 0;    // szünetkor megőrzött hátralévő idő (ms)
    let timerRunning = false;

    let swStart = 0;           // mikortól számolunk (ms epoch)
    let swElapsed = 0;         // szünetkor megőrzött eltelt idő (ms)
    let swRunning = false;

    let tickId = null;         // másodperces léptető (setTimeout)
    let frameId = null;        // stopper századmásodperces rajzolása (rAF)
    let alarmId = null;        // egyszeri riasztás a lejáratra

    // ---------------------------------------------------------------- olvasók

    function timerLeft() {
        return timerRunning ? Math.max(0, timerEndTime - Date.now()) : timerRemaining;
    }

    function swValue() {
        return swRunning ? Date.now() - swStart : swElapsed;
    }

    // ------------------------------------------------------------ formázás

    function pad(n, width = 2) {
        return String(n).padStart(width, '0');
    }

    function formatClock(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    // A visszaszámlálónál ceil kell: 10 mp beállításakor 00:00:10 látszik,
    // nem 00:00:09. A stoppernél floor a helyes.
    function timerText() {
        return formatClock(Math.ceil(timerLeft() / 1000));
    }

    function stopwatchText() {
        const ms = swValue();
        return `${formatClock(Math.floor(ms / 1000))}.${pad(Math.floor((ms % 1000) / 10))}`;
    }

    // ------------------------------------------------------------- rajzolás

    function render() {
        timerDisplay.textContent = timerText();
        stopwatchDisplay.textContent = stopwatchText();

        // Egyetlen helyen dől el a lapcím, így a két óra nem írja felül egymást.
        const parts = [];
        if (timerRunning) parts.push(`⏳ ${timerText()}`);
        if (swRunning) parts.push(`⏱ ${formatClock(Math.floor(swValue() / 1000))}`);
        document.title = parts.length ? `${parts.join('  ')} — ${BASE_TITLE}` : BASE_TITLE;
    }

    // --------------------------------------------------------- ütemezés

    // Mindig a következő egész másodperc HATÁRÁRA ütemezünk, nem fix 1000 ms-re,
    // így nem halmozódik a csúszás.
    function nextBoundary() {
        const now = Date.now();
        let delay = 1000;
        if (timerRunning) {
            const rest = (timerEndTime - now) % 1000;
            delay = Math.min(delay, rest > 0 ? rest : 1000);
        }
        if (swRunning) {
            delay = Math.min(delay, 1000 - ((now - swStart) % 1000));
        }
        return Math.max(20, delay) + 5;
    }

    function scheduleTick() {
        clearTimeout(tickId);
        tickId = null;
        if (!timerRunning && !swRunning) return;
        tickId = setTimeout(function tick() {
            render();
            scheduleTick();
        }, nextBoundary());
    }

    function frame() {
        render();
        frameId = requestAnimationFrame(frame);
    }

    // A rAF rejtett fülön egyáltalán nem fut, ezért csak a századmásodperces
    // rajzolást bízzuk rá, és látható állapotban indítjuk újra.
    function syncLoops() {
        cancelAnimationFrame(frameId);
        frameId = null;
        if (swRunning && !document.hidden) frameId = requestAnimationFrame(frame);
        scheduleTick();
    }

    // -------------------------------------------------------------- riasztás

    let audioCtx = null;

    function beep() {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            [0, 0.45, 0.9].forEach((offset) => {
                const t = audioCtx.currentTime + offset;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, t);
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start(t);
                osc.stop(t + 0.4);
            });
        } catch (err) {
            console.warn('Nem sikerult hangot lejatszani:', err);
        }
    }

    // A lejáratot NEM a kijelző hurokra bízzuk: egyetlen hosszú, egyszeri
    // setTimeout sokkal megbízhatóbban ébred, mint egy throttle-olt ismétlődő hurok.
    function armAlarm() {
        clearTimeout(alarmId);
        alarmId = null;
        if (!timerRunning) return;
        alarmId = setTimeout(fireAlarm, Math.max(0, timerEndTime - Date.now()));
    }

    function fireAlarm() {
        if (!timerRunning) return;
        timerRunning = false;
        timerRemaining = 0;
        clearTimeout(alarmId);
        alarmId = null;
        startTimerBtn.textContent = 'Start timer';
        document.body.classList.add('is-alarming');
        beep();
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(BASE_TITLE, { body: 'Time is up.' });
        }
        render();
        syncLoops();
    }

    function clearAlarmState() {
        document.body.classList.remove('is-alarming');
    }

    // ------------------------------------------------------------------ fülek

    function selectTab(name) {
        const onTimer = name === 'timer';
        timerTab.classList.toggle('active', onTimer);
        stopwatchTab.classList.toggle('active', !onTimer);
        timerTab.setAttribute('aria-selected', String(onTimer));
        stopwatchTab.setAttribute('aria-selected', String(!onTimer));
        timerPanel.classList.toggle('active', onTimer);
        stopwatchPanel.classList.toggle('active', !onTimer);
    }

    timerTab.addEventListener('click', () => selectTab('timer'));
    stopwatchTab.addEventListener('click', () => selectTab('stopwatch'));

    // ---------------------------------------------------------------- időzítő

    function readDuration() {
        const h = parseInt($('timer-hours').value, 10) || 0;
        const m = parseInt($('timer-minutes').value, 10) || 0;
        const s = parseInt($('timer-seconds').value, 10) || 0;
        if (h < 0 || m < 0 || s < 0) return -1;
        return ((h * 3600) + (m * 60) + s) * 1000;
    }

    function showTimerError(message) {
        timerError.textContent = message;
        timerError.hidden = !message;
    }

    startTimerBtn.addEventListener('click', function () {
        clearAlarmState();

        if (timerRunning) {
            timerRemaining = timerLeft();
            timerRunning = false;
            clearTimeout(alarmId);
            alarmId = null;
            startTimerBtn.textContent = 'Resume timer';
            render();
            syncLoops();
            return;
        }

        let ms = timerRemaining;
        if (ms <= 0) {
            ms = readDuration();
            if (ms < 0) {
                showTimerError('Enter positive numbers only.');
                return;
            }
            if (ms === 0) {
                showTimerError('Set an hour, minute or second value first.');
                return;
            }
        }

        showTimerError('');
        timerRemaining = 0;
        timerRunning = true;
        timerEndTime = Date.now() + ms;
        startTimerBtn.textContent = 'Pause timer';
        armAlarm();
        render();
        syncLoops();

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    });

    resetTimerBtn.addEventListener('click', function () {
        timerRunning = false;
        timerRemaining = 0;
        timerEndTime = 0;
        clearTimeout(alarmId);
        alarmId = null;
        clearAlarmState();
        showTimerError('');
        startTimerBtn.textContent = 'Start timer';
        render();
        syncLoops();
    });

    // ----------------------------------------------------------------- stopper

    startStopwatchBtn.addEventListener('click', function () {
        if (swRunning) {
            swElapsed = Date.now() - swStart;
            swRunning = false;
            startStopwatchBtn.textContent = 'Start';
        } else {
            swStart = Date.now() - swElapsed;
            swRunning = true;
            startStopwatchBtn.textContent = 'Pause';
        }
        render();
        syncLoops();
    });

    resetStopwatchBtn.addEventListener('click', function () {
        swRunning = false;
        swElapsed = 0;
        swStart = 0;
        startStopwatchBtn.textContent = 'Start';
        render();
        syncLoops();
    });

    // ------------------------------------------------------- fül láthatóság

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            cancelAnimationFrame(frameId);
            frameId = null;
            return;
        }
        // Visszatéréskor azonnali resync: az érték a Date.now()-ból jön,
        // tehát pontos, csak a kirajzolás maradt le.
        if (timerRunning && Date.now() >= timerEndTime) {
            fireAlarm();
        } else {
            render();
            syncLoops();
        }
    });

    // ----------------------------------------------------------------- indulás

    selectTab('timer');
    render();
});
