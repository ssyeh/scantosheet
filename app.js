document.addEventListener('DOMContentLoaded', () => {
    // !!! =============================================================== !!!
    // !!! ==> 請將此處的網址替換成你從 Google Apps Script 取得的部署網址 <== !!!
    // !!! =============================================================== !!!
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQZ6Zu78wIFAt6pzutgT6ofZbyZ4SW3UpMdIV32gc/dev';

    // --- DOM Elements ---
    const statusMessageElement = document.getElementById('status-message');
    const confirmationDialog = document.getElementById('scan-confirmation');
    const activityTypeElement = document.getElementById('activityType');
    const scoreElement = document.getElementById('score');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // --- State ---
    let lastScannedData = null;

    // --- Audio Context for Beep Sound ---
    let audioContext;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Web Audio API is not supported in this browser.');
    }

    /**
     * Plays a short beep sound.
     */
    function playBeep() {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(5000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    /**
     * Displays a final status message (success or error).
     * @param {string} message The message to display.
     * @param {boolean} isSuccess True for success, false for error.
     */
    function showStatusMessage(message, isSuccess) {
        statusMessageElement.textContent = message;
        statusMessageElement.className = isSuccess ? 'success' : 'error';
        statusMessageElement.style.display = 'block';

        setTimeout(() => {
            statusMessageElement.style.display = 'none';
        }, 4000);
    }

    /**
     * Resets the UI to the initial scanning state.
     */
    function resetUI() {
        lastScannedData = null;
        confirmationDialog.classList.add('dialog-hidden');
        html5QrcodeScanner.resume();
    }

    /**
     * Handles the confirmation of a scan.
     */
    async function handleConfirm() {
        if (!lastScannedData) return;

        const { studentID, activityType, score } = lastScannedData;
        showStatusMessage(`正在傳送學號: ${studentID}...`, true);
        confirmationDialog.classList.add('dialog-hidden');

        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lastScannedData),
            });
            showStatusMessage(`學號 ${studentID} 已成功傳送！`, true);
        } catch (error) {
            console.error('Error sending data:', error);
            showStatusMessage(`傳送失敗: ${error.message}`, false);
        }
        // Reset after a short delay to allow user to see the message
        setTimeout(resetUI, 2000);
    }

    /**
     * Handles the cancellation of a scan.
     */
    function handleCancel() {
        showStatusMessage('已取消操作', false);
        resetUI();
    }

    // Add event listeners to confirmation buttons
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    /**
     * Callback for successful scan.
     * @param {string} decodedText The decoded text from the barcode.
     */
    function onScanSuccess(decodedText) {
        // Prevent multiple triggers for the same scan
        if (lastScannedData) return;

        html5QrcodeScanner.pause();
        playBeep();

        const activityType = activityTypeElement.value;
        const score = scoreElement.value;

        lastScannedData = { studentID: decodedText, activityType, score };

        // Display data in the confirmation dialog
        document.getElementById('confirm-student-id').textContent = decodedText;
        document.getElementById('confirm-activity').textContent = activityType;
        document.getElementById('confirm-score').textContent = score;

        // Show the dialog
        confirmationDialog.classList.remove('dialog-hidden');
    }

    function onScanFailure(errorMessage) {
        // Ignore non-critical errors
    }

    // --- Main Scanner Initialization ---
    const html5QrcodeScanner = new Html5QrcodeScanner(
        'reader',
        {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            // Request the front camera
            camera: {
                facingMode: 'user'
            }
        },
        false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});