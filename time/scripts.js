document.addEventListener('DOMContentLoaded', function() {
    let timerTab = document.getElementById('timer-tab');
    let stopwatchTab = document.getElementById('stopwatch-tab');
    let timerContent = document.getElementById('timer');
    let stopwatchContent = document.getElementById('stopwatch');
    let timerDisplay = document.getElementById('timer-display');
    let stopwatchDisplay = document.getElementById('stopwatch-display');
    let timerEndTime;
    let stopwatchStartTime;
    let stopwatchElapsedTime = 0;
    let timerRunning = false;
    let stopwatchRunning = false;
    let timerRequestId;
    let stopwatchRequestId;

    timerTab.addEventListener('click', function() {
        timerTab.classList.add('active');
        stopwatchTab.classList.remove('active');
        timerContent.classList.add('active');
        stopwatchContent.classList.remove('active');
    });

    stopwatchTab.addEventListener('click', function() {
        timerTab.classList.remove('active');
        stopwatchTab.classList.add('active');
        timerContent.classList.remove('active');
        stopwatchContent.classList.add('active');
    });

    document.getElementById('start-timer').addEventListener('click', function() {
        if (timerRunning) return;
        let hours = parseInt(document.getElementById('timer-hours').value) || 0;
        let minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
        let seconds = parseInt(document.getElementById('timer-seconds').value) || 0;
        let duration = (hours * 3600) + (minutes * 60) + seconds;
        if (duration > 0) {
            timerRunning = true;
            timerEndTime = Date.now() + (duration * 1000);
            timerRequestId = requestAnimationFrame(updateTimer);
        }
    });

    document.getElementById('reset-timer').addEventListener('click', function() {
        timerRunning = false;
        cancelAnimationFrame(timerRequestId);
        updateTimerDisplay(0);
        document.title = 'Timer & Stopwatch';
    });

    document.getElementById('start-stopwatch').addEventListener('click', function() {
        if (!stopwatchRunning) {
            stopwatchRunning = true;
            stopwatchStartTime = Date.now() - stopwatchElapsedTime;
            stopwatchRequestId = requestAnimationFrame(updateStopwatch);
        } else {
            stopwatchRunning = false;
            cancelAnimationFrame(stopwatchRequestId);
            stopwatchElapsedTime = Date.now() - stopwatchStartTime;
        }
    });

    document.getElementById('reset-stopwatch').addEventListener('click', function() {
        stopwatchRunning = false;
        cancelAnimationFrame(stopwatchRequestId);
        stopwatchElapsedTime = 0;
        updateStopwatchDisplay(0);
        document.title = 'Timer & Stopwatch';
    });

    function updateTimer() {
        let remaining = Math.max(0, Math.floor((timerEndTime - Date.now()) / 1000));
        updateTimerDisplay(remaining);
        document.title = `Timer: ${formatTime(remaining)}`;
        if (remaining > 0 && timerRunning) {
            timerRequestId = requestAnimationFrame(updateTimer);
        } else {
            timerRunning = false;
        }
    }

    function updateStopwatch() {
        let elapsed = Math.floor((Date.now() - stopwatchStartTime) / 1000);
        updateStopwatchDisplay(elapsed);
        document.title = `Stopwatch: ${formatTime(elapsed)}`;
        if (stopwatchRunning) {
            stopwatchRequestId = requestAnimationFrame(updateStopwatch);
        }
    }

    function updateTimerDisplay(time) {
        timerDisplay.textContent = formatTime(time);
    }

    function updateStopwatchDisplay(time) {
        stopwatchDisplay.textContent = formatTime(time);
    }

    function formatTime(time) {
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time % 3600) / 60);
        let seconds = time % 60;
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    function pad(number) {
        return number < 10 ? '0' + number : number;
    }
});
