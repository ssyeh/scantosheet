document.addEventListener('DOMContentLoaded', () => {
    // !!! =============================================================== !!!
    // !!! ==> 請將此處的網址替換成你從 Google Apps Script 取得的部署網址 <== !!!
    // !!! =============================================================== !!!
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRuFeoMZ2hcs3HDS4HQ7auxkm9ibMFyXAAJAYczHFAXPwqpUOdyNjvd_5KKV4KuhBJ/exec';
    
    // --- DOM Elements ---
    const statusMessageElement = document.getElementById('status-message');
    const confirmationDialog = document.getElementById('scan-confirmation');
    const activityTypeElement = document.getElementById('activityType');
    const scoreElement = document.getElementById('score');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    /**
     * Fetches the list of activities from the Google Apps Script and populates the dropdown.
     */
    async function populateActivities() {
        try {
            // Append a query parameter to indicate we want to fetch activities
            const response = await fetch(`${APPS_SCRIPT_URL}?action=getActivities`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result.status === 'success' && Array.isArray(result.data)) {
                activityTypeElement.innerHTML = ''; // Clear existing options
                result.data.forEach(activity => {
                    const option = document.createElement('option');
                    option.value = activity;
                    option.textContent = activity;
                    activityTypeElement.appendChild(option);
                });
            } else {
                throw new Error(result.message || 'Failed to load activities.');
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
            // Keep default options as a fallback
            showStatusMessage('無法載入活動清單，請檢查網路連線或後台設定。', false);
        }
    }

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
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(2.0, audioContext.currentTime);
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
            // We can request the camera directly without specifying front or back
            camera: true
        },
        false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

    // Fetch and populate the activity list when the page loads
    populateActivities();
});